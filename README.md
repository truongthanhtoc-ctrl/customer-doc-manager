# Customer Document Manager

A lightweight, serverless Customer Document Management System that runs entirely in the browser and syncs data to your GitHub repository.

## Features
- **Serverless**: No backend server required.
- **Data Sync**: Uses GitHub API to save data to `db.json` in this repository.
- **Premium UI**: Built with Tailwind CSS and Glassmorphism design.
- **Single Page App**: Fast and responsive.

## How to Deploy (GitHub Pages)
1.  Go to **Settings** > **Pages** in this repository.
2.  Under **Source**, select `Deploy from a branch`.
3.  Under **Branch**, select `main` and `/ (root)`.
4.  Click **Save**.
5.  Visit the provided URL (e.g., `https://truongthanhtoc-ctrl.github.io/customer-doc-manager/`).

## Setup
On first load, you will be asked for:
- **GitHub Token**: A Personal Access Token with `repo` scope.
- **Username**: `truongthanhtoc-ctrl`
- **Repository**: This repository name (e.g., `customer-doc-manager`).

## Privacy
Your GitHub Token is stored **only in your browser's Local Storage**. It is never sent to any third-party server, strictly communicated between your browser and the GitHub API.
