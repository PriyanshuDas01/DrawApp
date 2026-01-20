# Quick Start Guide

## Installation & Running

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open multiple browser windows:**
   - Open http://localhost:3000 in multiple tabs/windows
   - Each window represents a different user
   - Start drawing to see real-time synchronization!

## Testing Multi-User Features

1. **Real-time Drawing:**
   - Open 2-3 browser windows
   - Draw in one window - you should see it appear in others instantly

2. **User Indicators:**
   - Move your mouse over the canvas
   - Other users should see your cursor position with your color

3. **Global Undo/Redo:**
   - Draw something in one window
   - Click "Undo" in another window
   - The drawing should disappear for all users

4. **User Management:**
   - Check the sidebar to see all online users
   - Each user gets a unique color
   - Users are automatically added/removed when they join/leave

## Features to Test

- ✅ Brush tool with different colors and sizes
- ✅ Eraser tool with adjustable size
- ✅ Real-time synchronization (see others draw as they draw)
- ✅ Cursor indicators showing other users' positions
- ✅ Global undo/redo (works across all users)
- ✅ User list showing online users

## Troubleshooting

**Socket connection not working:**
- Make sure the dev server is running
- Check browser console for errors
- Try refreshing the page

**Canvas not drawing:**
- Make sure you've selected a tool (Brush or Eraser)
- Check that your mouse/touch events are working
- Look for connection status in the top-left

**Other users not appearing:**
- Make sure multiple browser windows/tabs are open
- Check that all windows are connected (no "Connecting..." message)
- Verify users appear in the sidebar

## Technical Notes

- The app uses WebSockets for real-time communication
- Drawing operations are optimized and batched for performance
- Canvas operations are implemented from scratch (no drawing libraries)
- Server maintains authoritative state for global undo/redo