# HTML to Figma Extension

This extension allows you to copy HTML elements from any website and paste them as native Figma layers.

## How it works

The extension has two main parts:

1.  **A Chrome Extension (the frontend):** This allows you to select an element on any webpage.
2.  **A Node.js Server (the backend):** This takes the selected HTML and converts it into a format that Figma can understand.

## Setup Instructions

### 1. Run the backend server

The backend server is responsible for converting the HTML to Figma's clipboard format.

1.  Navigate to the `backend/backend` directory:
    ```bash
    cd backend/backend
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```
3.  Start the server:
    ```bash
    npm start
    ```

The server will be running on `https://localhost:8080`.

### 2. Load the extension in your browser

1.  Open your Chrome browser and navigate to `chrome://extensions`.
2.  Enable "Developer mode" by clicking the toggle switch at the top right corner.
3.  Click the "Load unpacked" button.
4.  Select the root directory of this project (the one that contains the `manifest.json` file).

## How to use the extension

1.  Click on the extension's icon in the browser toolbar to open the popup.
2.  The selector will start automatically. Hover over the elements on the page to see them highlighted.
3.  Click on the element you want to copy.
4.  A "Copy to Figma" button will appear. Click it to copy the element to your clipboard.
5.  Paste the element in your Figma design.

## How to deploy the backend to production

To deploy the backend server to a production environment, you will need to:

1.  **Choose a hosting provider:** Some popular options include Heroku, AWS, and Google Cloud.
2.  **Obtain an SSL certificate:** You will need to obtain an SSL certificate from a trusted certificate authority (CA) to enable HTTPS. You can get a free SSL certificate from Let's Encrypt.
3.  **Configure your server:** You will need to configure your server to use the SSL certificate and to listen on the correct port.
4.  **Deploy your code:** You can deploy your code to the hosting provider using a variety of methods, such as Git, FTP, or a command-line interface.

Once your backend server is deployed, you will need to update the `API_ENDPOINT` in the `content.js` file to point to your production server.
