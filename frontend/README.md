# Voice Interview Platform

This is a Next.js application for creating and managing voice-based customer research interviews.

## Getting Started


2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    ```
    Open [http://localhost:3000](http://localhost:3000) (or your configured port) with your browser to see the result.


## Project Structure

-   `/app`: Contains the core application routes and UI, using the Next.js App Router.
-   `/components`: Shared React components used throughout the application.
-   `/public`: Static assets.
-   `/styles`: Global styles (though most styling might be via Tailwind CSS in components).

## API Endpoints


#### `POST /api/campaigns`

This endpoint is used to create a new interview campaign. The data is currently being stored in an in-memory array on the server for development and mocking purposes. This means the data will be reset if the server restarts.

**Data Sent to `POST /api/campaigns`:**

The following JSON payload is expected by this endpoint when creating a new campaign (typically sent from the `/admin` page):

```json
{
  "campaign_id": "string", // Client-generated unique ID (same as id, for explicit reference)
  "researchName": "string", // The name of the research campaign
  "customerName": "string", // The name of the customer or project associated
  "screenoutUrl": "string", // URL to redirect to if participant is screened out
  "qualityUrl": "string", // URL to redirect to if participant fails a quality check (currently not implemented)
  "completedUrl": "string", // URL to redirect to upon successful completion of the interview
  "questions": [
    { "id": "string", "text": "string" } // Array of voice interview questions
  ],
  "demographicFields": [
    {
      "id": "string",
      "label": "string",
      "type": "text | select | slider",
      "options": "string[]", // Optional: array of strings for 'select' type
      "min": "number",       // Optional: minimum value for 'slider' type
      "max": "number"        // Optional: maximum value for 'slider' type
    }
    // ... more demographic field configurations
  ],
  "screenoutQuestions": [
    { "id": "string", "text": "string" } // Array of Yes/No screenout questions
  ],
  "createdAt": "string" // ISO string representing the creation timestamp
}
```

**Example Payload:**

```json
{
  "campaign_id": "a1b2c3d4e5",
  "researchName": "User Feedback Q3",
  "customerName": "Acme Corp",
  "screenoutUrl": "https://example.com/thankyou-screenout",
  "qualityUrl": "https://example.com/quality-issue",
  "completedUrl": "https://example.com/thankyou-completed",
  "questions": [
    { "id": "q1", "text": "What is your favorite feature?" },
    { "id": "q2", "text": "How can we improve the dashboard?" }
  ],
  "demographicFields": [
    {
      "id": "demo1",
      "label": "Age Range",
      "type": "slider",
      "min": 18,
      "max": 65
    },
    {
      "id": "demo2",
      "label": "Primary Device",
      "type": "select",
      "options": ["Mobile", "Desktop", "Tablet"]
    }
  ],
  "screenoutQuestions": [
    { "id": "sq1", "text": "Have you used our product in the last month?" }
  ],
  "createdAt": "2023-10-27T10:30:00.000Z"
}
```

