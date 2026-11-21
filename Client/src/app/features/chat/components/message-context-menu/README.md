# Message Context Menu Component

## Mô tả
Component `MessageContextMenu` được tách riêng để xử lý menu ngữ cảnh (right-click menu) cho các tin nhắn. Component này có thể tái sử dụng trong các phần khác của ứng dụng.

## Vị trí
```
src/app/features/chat/components/message-context-menu/
  ├── message-context-menu.component.ts
  ├── message-context-menu.component.html
  ├── message-context-menu.component.scss
  └── index.ts
```

## Cách sử dụng

### Import
```typescript
import { MessageContextMenuComponent, MessageContextMenuPosition } from '@app/features/chat/components';
```

### Template
```html
<app-message-context-menu
  [menuPosition]="messageContextMenu()"
  (messageCopied)="handleMessageCopied($event)"
  (menuClosed)="handleMenuClosed()"
></app-message-context-menu>
```

### Component
```typescript
@Component({
  selector: "app-my-component",
  standalone: true,
  imports: [CommonModule, MessageContextMenuComponent],
  template: `...`
})
export class MyComponent {
  messageContextMenu = signal<MessageContextMenuPosition | null>(null);

  openContextMenu(event: MouseEvent, message: ConversationMessage): void {
    const menuWidth = 176;
    const menuHeight = 48;

    this.messageContextMenu.set({
      message,
      x: Math.min(event.clientX, window.innerWidth - menuWidth - 8),
      y: Math.min(event.clientY, window.innerHeight - menuHeight - 8),
    });
  }

  handleMessageCopied(message: ConversationMessage): void {
    // Xử lý copy message
    this.copyText(message.content);
    this.messageContextMenu.set(null);
  }

  handleMenuClosed(): void {
    this.messageContextMenu.set(null);
  }
}
```

## Input
- `menuPosition`: Signal<MessageContextMenuPosition | null> - Vị trí menu và thông tin tin nhắn

## Output
- `messageCopied`: Output<ConversationMessage> - Phát ra khi người dùng click "Sao chép"
- `menuClosed`: Output<void> - Phát ra khi menu đóng (click ngoài hoặc Escape)

## Tính năng
- ✅ Hiển thị tại vị trí chuột phải (tính toán để không ra khỏi viewport)
- ✅ Đóng khi click ngoài menu
- ✅ Đóng khi bấm Escape
- ✅ Nút "Sao chép" tin nhắn
- ✅ Hỗ trợ các biểu tượng Lucide
