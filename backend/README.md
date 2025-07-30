# HTML to Figma Extension

This extension allows you to copy HTML elements from any website and paste them as native Figma layers.

## How to run the extension

### 1. Run the backend server

The backend server is responsible for converting the HTML to Figma's clipboard format.

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```
3.  Start the server:
    ```bash
    npm start
    ```

The server will be running on `http://localhost:8080`.

### 2. Load the extension in your browser

1.  Open your Chrome browser and navigate to `chrome://extensions`.
2.  Enable "Developer mode" by clicking the toggle switch at the top right corner.
3.  Click the "Load unpacked" button.
4.  Select the root directory of this project (the one that contains the `manifest.json` file).

## How to use the extension

1.  Click on the extension's icon in the browser toolbar to open the popup.
2.  Click the "Select an element" button.
3.  Hover over the elements on the page to see them highlighted.
4.  Click on the element you want to copy.
5.  The "Copy for Figma" button will be enabled. Click it to copy the element to your clipboard.
6.  Paste the element in your Figma design.
