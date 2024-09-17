const mysql = require('mysql');

// MySQL connection setup
const db = mysql.createConnection({
  host: 'b0skpetyeumfikdsozxq-mysql.services.clever-cloud.com',
  user: 'uyafzcppwzpxanvu',
  password: 'NbJHuYyRsAXbtRUiYCnx',
  database: 'b0skpetyeumfikdsozxq'
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to MySQL database');
});

module.exports = db;
