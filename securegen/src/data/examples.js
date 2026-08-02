export const examples = [
  {
    id: "sql-injection",
    label: "SQL Injection",
    language: "python",
    code: `@app.route('/user')
def get_user():
    username = request.args.get('username')
    query = "SELECT * FROM users WHERE username = '" + username + "'"
    cursor = get_db().cursor()
    cursor.execute(query)
    return jsonify(cursor.fetchall())`
  },
  {
    id: "hardcoded-secret",
    label: "Hardcoded Secret",
    language: "javascript",
    code: `const AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE";
const AWS_SECRET_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";

async function fetchData() {
    const response = await fetch('https://api.example.com/data', {
        headers: {
            'Authorization': 'Bearer ' + AWS_SECRET_KEY
        }
    });
    return response.json();
}`
  },
  {
    id: "insecure-auth",
    label: "Insecure Auth",
    language: "javascript",
    code: `const jwt = require('jsonwebtoken');

function login(user) {
    // Generate token with weak secret and no expiration
    const token = jwt.sign(
        { id: user.id, role: user.role },
        'secret123' 
    );
    return token;
}`
  },
  {
    id: "path-traversal",
    label: "Path Traversal",
    language: "python",
    code: `import os
from flask import request, send_file, Flask

app = Flask(__name__)

@app.route('/download')
def download_file():
    filename = request.args.get('file')
    # Directly joins user input to path
    filepath = os.path.join('/var/www/uploads', filename)
    return send_file(filepath)`
  }
];