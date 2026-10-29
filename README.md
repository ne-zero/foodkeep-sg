# FoodKeep SG — Cloud-connected pantry manager

**Individual student project | JavaScript frontend, AWS-backed application**

FoodKeep SG helps people keep track of food items stored at home, review expiry dates, and manage a virtual pantry. This repository preserves the **JavaScript frontend module from an earlier project export**, not the complete application. The original application was demonstrated as working, although image-analysis results were not always accurate.

## Implemented features in the saved JavaScript

- Sign-in flow using Amazon Cognito OAuth with PKCE
- Pantry item creation, retrieval, editing and deletion through authenticated API requests
- Expiry-date calculations, status displays, search and filtering
- Food photo selection, image preview, analysis request and user review of suggested results
- Profile display and browser speech playback for pantry item information
- API wrapper for a recipe-suggestion endpoint (availability depends on the backend)

## Technology

- **Frontend:** vanilla JavaScript and browser APIs
- **Authentication:** Amazon Cognito OAuth / PKCE
- **Backend integration:** REST API calls to an AWS-hosted endpoint
- **Other AWS services:** the original broader project used AWS services, but backend infrastructure/configuration are **not included in this export**

## Repository structure

```text
js/
  api.js              # Authenticated API calls
  app.js              # Navigation and app initialization
  auth.js             # OAuth / PKCE login flow
  common.js           # Shared helpers and expiry calculations
  config.example.js   # Placeholder-only deployment configuration
  pantry.js           # Pantry dashboard, filters and item actions
  profile.js          # Profile UI logic
  scan.js             # Image analysis and review flow
```

## Running the project

**This archive is not independently runnable.** The original HTML/CSS pages and backend (including API endpoints and cloud resources) are missing. To reconstruct a running version, those components and your own AWS configuration are necessary. The code expects `js/config.js`; copy `js/config.example.js` to that name and set values for an environment you control. Do not commit your private `config.js`.

## Limitations and provenance

- This is an earlier surviving export, not verified as the last submitted project version.
- Food recognition can make mistakes; users review or correct the analysis. No accuracy percentage is claimed.
- This repository includes frontend JavaScript only. It does not contain the original HTML/CSS, Lambda code, infrastructure or live AWS deployment.
- The original deployment identifiers were replaced by placeholders before publication.

## Author

Developed individually by Mohamad Anis Bin Mohamad Suhaimi as a student project.
