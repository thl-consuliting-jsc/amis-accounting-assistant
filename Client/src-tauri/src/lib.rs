use serde::Serialize;
use std::{
    fs::{self, File},
    io::{Cursor, copy},
    path::PathBuf,
};
use tauri::{
    AppHandle, Manager,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};
use zip::ZipArchive;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(Serialize)]
struct InstallStickerPackResult {
    pack_dir: String,
    file_count: usize,
}

#[tauri::command]
fn install_sticker_pack(
    app: AppHandle,
    pack_id: u32,
    manifest_json: String,
    zip_bytes: Vec<u8>,
) -> Result<InstallStickerPackResult, String> {
    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|error| format!("Cannot resolve app cache dir: {error}"))?;
    let pack_dir = cache_dir.join("stickers").join(format!("pack{pack_id}"));

    if pack_dir.exists() {
        fs::remove_dir_all(&pack_dir)
            .map_err(|error| format!("Cannot clear existing sticker pack: {error}"))?;
    }

    fs::create_dir_all(&pack_dir)
        .map_err(|error| format!("Cannot create sticker pack directory: {error}"))?;

    let mut archive = ZipArchive::new(Cursor::new(zip_bytes))
        .map_err(|error| format!("Cannot read sticker pack zip: {error}"))?;
    let mut file_count = 0;

    for index in 0..archive.len() {
        let mut zip_file = archive
            .by_index(index)
            .map_err(|error| format!("Cannot read zip entry: {error}"))?;
        let Some(enclosed_name) = zip_file.enclosed_name().map(PathBuf::from) else {
            continue;
        };
        let output_path = pack_dir.join(enclosed_name);

        if zip_file.is_dir() {
            fs::create_dir_all(&output_path)
                .map_err(|error| format!("Cannot create zip directory: {error}"))?;
            continue;
        }

        if let Some(parent) = output_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("Cannot create zip parent directory: {error}"))?;
        }

        let mut output_file = File::create(&output_path)
            .map_err(|error| format!("Cannot create sticker file: {error}"))?;
        copy(&mut zip_file, &mut output_file)
            .map_err(|error| format!("Cannot write sticker file: {error}"))?;
        file_count += 1;
    }

    fs::write(pack_dir.join("manifest.json"), manifest_json)
        .map_err(|error| format!("Cannot write manifest.json: {error}"))?;

    Ok(InstallStickerPackResult {
        pack_dir: pack_dir.to_string_lossy().to_string(),
        file_count,
    })
}

#[tauri::command]
fn open_path_in_explorer(path: String) -> Result<bool, String> {
    use std::process::Command;
    let clean_path = path.trim().trim_matches('"');
    let path_obj = std::path::Path::new(clean_path);
    if path_obj.is_file() {
        Command::new("explorer.exe")
            .arg(format!("/select,\"{}\"", clean_path))
            .spawn()
            .map_err(|e| e.to_string())?;
    } else {
        Command::new("explorer.exe")
            .arg(clean_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(true)
}

#[tauri::command]
fn save_and_open_file(folder_path: String, file_name: String, bytes: Vec<u8>, open_explorer: bool) -> Result<String, String> {
    let clean_folder = folder_path.trim().trim_matches('"');
    let dir = if clean_folder.is_empty() {
        let user_profile = std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\".to_string());
        std::path::PathBuf::from(user_profile).join("Downloads")
    } else {
        std::path::PathBuf::from(clean_folder)
    };
    if !dir.exists() {
        std::fs::create_dir_all(&dir).map_err(|e| format!("Cannot create dir: {}", e))?;
    }
    let target_file = dir.join(&file_name);
    std::fs::write(&target_file, &bytes).map_err(|e| format!("Write failed: {}", e))?;
    let full_path = target_file.to_string_lossy().to_string();
    if open_explorer {
        let _ = std::process::Command::new("explorer.exe")
            .arg(format!("/select,\"{}\"", full_path))
            .spawn();
    }
    Ok(full_path)
}

#[tauri::command]
fn pick_folder(initial_path: Option<String>) -> Result<Option<String>, String> {
    use std::process::Command;
    let init = initial_path.unwrap_or_default();
    let script = format!(
        r#"Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description = 'Chọn thư mục lưu tệp'; $d.ShowNewFolderButton = $true; if ('{}' -ne '') {{ $d.SelectedPath = '{}' }}; if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {{ Write-Output $d.SelectedPath }}"#,
        init.replace('\\', "\\\\"),
        init.replace('\\', "\\\\")
    );
    let output = Command::new("powershell")
        .args(["-NoProfile", "-STA", "-Command", &script])
        .output()
        .map_err(|e| e.to_string())?;
    let result = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if result.is_empty() {
        Ok(None)
    } else {
        Ok(Some(result))
    }
}

/// Hiển thị và focus cửa sổ chính
fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

/// Tạo system tray với menu
fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let show_item = MenuItem::with_id(app, "show", "Mở AMT Chat", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Thoát", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

    TrayIconBuilder::with_id("amt-tray")
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("AMT Chat Internal")
        .menu(&menu)
        .show_menu_on_left_click(false)
        // Click trái vào tray icon → hiện cửa sổ
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        })
        // Xử lý click menu item
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_main_window(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Single instance: nếu user mở app lần 2, focus lại cửa sổ instance đầu tiên
        .plugin(
            tauri_plugin_single_instance::init(|app, _args, _cwd| {
                // Instance thứ 2 bị chặn → show và focus instance đầu
                show_main_window(app);
            })
        )
        .plugin(tauri_plugin_updater::Builder::new().build()) // ← THÊM
        .plugin(tauri_plugin_process::init())                 // ← THÊM
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Khởi tạo system tray
            setup_tray(app.handle())?;
            let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    use tauri_plugin_updater::UpdaterExt;
                    match handle.updater() {
                        Ok(updater) => {
                            println!("[UPDATER] Checking for updates...");
                            match updater.check().await {
                                Ok(Some(u)) => println!("[UPDATER] Found: {}", u.version),
                                Ok(None)    => println!("[UPDATER] Up to date"),
                                Err(e)      => println!("[UPDATER] Error: {e:#}"),
                            }
                        }
                        Err(e) => println!("[UPDATER] Init error: {e}"),
                    }
                });
            // Intercept sự kiện close cửa sổ → ẩn xuống tray thay vì thoát
            let window = app.get_webview_window("main").unwrap();
            window.on_window_event({
                let app_handle = app.handle().clone();
                move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        // Ngăn cửa sổ đóng thật sự
                        api.prevent_close();
                        // Ẩn cửa sổ xuống tray
                        if let Some(win) = app_handle.get_webview_window("main") {
                            let _ = win.hide();
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            install_sticker_pack,
            open_path_in_explorer,
            save_and_open_file,
            pick_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}