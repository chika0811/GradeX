# GradeX Hosting Guide

This guide explains how to run the GradeX application locally on your machine.

## Prerequisites

- **Node.js**: You must have Node.js installed.
- **Git** (Optional): Useful for cloning the repository.

## Quick Start (Windows)

1.  Navigate to the project folder.
2.  Double-click **`start_local.bat`**.
    - This script will automatically check for installed libraries (`node_modules`).
    - It will install them if missing.
    - It will start the local server.
3.  The browser should usually open automatically or you will see a link (e.g., `http://localhost:8080`) in the terminal window.

## Manual Start (Command Line)

1.  Open your terminal.
2.  Navigate to the project directory.
3.  Install dependencies (first time only): `npm install`
4.  Start the development server: `npm run dev`

## Admin Access

- **Admin Link**: On the login page, click "Admin Access" at the bottom to go to the admin login.
- **Direct URL**: `http://localhost:8080/admin/login`

## Troubleshooting

- **Port already in use**: Check the terminal output for the actual URL if 8080 is taken.
- **Missing dependencies**: If errors occur, try deleting the `node_modules` folder and running `npm install`.
