# Upload This Project to GitHub

Follow these steps to push this project to GitHub.

## 1. Create a new repository on GitHub

1. Go to **https://github.com/new**
2. Sign in if needed.
3. Set **Repository name** (e.g. `Web-Based-Gamified-Learning-Game-Testing`).
4. Choose **Public**.
5. **Do not** check "Add a README file" (the project already has one).
6. Click **Create repository**.

## 2. Connect and push from your computer

In a terminal, from this project folder, run (replace `YOUR_USERNAME` and `YOUR_REPO` with your GitHub username and repo name):

```bash
cd "c:\Capstone\Web-Based Gamified Learning - Game Testing"

git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

**Example** if your username is `juan` and repo name is `gamified-learning`:

```bash
git remote add origin https://github.com/juan/gamified-learning.git
git push -u origin main
```

## 3. If GitHub asks for login

- Use **GitHub CLI** (`gh auth login`) or
- Use a **Personal Access Token** as the password when Git asks (Settings → Developer settings → Personal access tokens on GitHub).

After this, your project will be on GitHub and you can share the repo URL or deploy it (e.g. to Render).
