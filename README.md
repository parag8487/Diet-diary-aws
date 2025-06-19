# DietDiary

DietDiary is a comprehensive web application designed to help users track their daily meals, calories, protein intake, and monitor their BMI. It features an AI-powered chatbot for nutrition advice, an admin dashboard for food management, and a user-friendly interface for both customers and administrators.

## Features

- **User Authentication:** Sign up, login, and manage your profile.
- **Meal & Food Tracking:** Add, view, and manage foods. Calculate daily and weekly nutrition (calories, protein, etc.).
- **BMI Assessment:** Calculate and visualize your Body Mass Index with interactive charts.
- **AI-Powered Chatbot:** Get instant nutrition and diet advice from an integrated AI assistant.
- **Admin Dashboard:** Manage food items, view statistics, and oversee user activity.
- **Customer Support:** Contact form for support and feedback.
- **FAQ/Help Section:** Interactive Q&A for common questions.


## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v14 or higher recommended)
- [MySQL](https://www.mysql.com/) database

### Installation
1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd DietDiary
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Set up environment variables:**
   Create a `.env` file in the root directory with the following variables:
   ```env
   DB_HOST=your_mysql_host
   DB_USER=your_mysql_user
   DB_PASSWORD=your_mysql_password
   DB_NAME=your_database_name
   DB_PORT=3306
   # Add any API keys if needed
   ```
4. **Set up the MySQL database:**
   - Ensure your MySQL server is running.
   - The app will automatically create necessary tables on first run.

## Running the App

Start the backend server:
```bash
npm start
```

The app will be available at [http://localhost:3000](http://localhost:3000).

Open `index.html` or `dashboard.html` in your browser for the main interface.

## Project Structure

- `server.js` — Express backend, API endpoints, and database logic
- `data/foods.json` — Food data storage (JSON)
- `*.html`, `*.js`, `*.css` — Frontend pages and styles
- `images/` — Food and UI images
- `package.json` — Project dependencies and scripts

## License

This project is licensed under the ISC License. See [LICENSE.txt](LICENSE.txt) for details.

## Author

This project was created and is maintained by **[Your Name]**.