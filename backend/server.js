// Import necessary libraries
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('./config/db'); 
require('dotenv').config();


const app = express();
app.use(cors());
app.use(express.json());


const API_KEY = process.env.API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });


const schema = JSON.stringify([
  { table_name: 'sales_data', columns: ['sale_id', 'product_id', 'quantity_sold', 'sale_date', 'total_price'] },
  { table_name: 'products', columns: ['product_id', 'name', 'category', 'price', 'stock_quantity'] },
  { table_name: 'customer_queries', columns: ['query_id', 'query_date', 'query_text', 'response_text'] }
]);


function cleanSQLQuery(sqlQuery) {
  // Remove ```sql and ``` markdown blocks
  return sqlQuery.replace(/```sql|```/g, '').trim();
}

// Route to handle user queries and generate SQL
app.post('/fetch-query', async (req, res) => {
  try {
    const userQuery = req.body.query;

    // Instruct Gemini API to generate a MySQL-compatible SQL query
    const prompt = `
      Generate a MySQL-compatible SQL query based on this unstructured query: '${userQuery}'.
      Use the following table schema: ${schema}.
      Make sure the query uses MySQL syntax, including date functions such as NOW() and DATE_SUB().
    `;

    const result = await model.generateContent(prompt);  
    let sqlQuery = result.response.text().trim();  

    
    sqlQuery = cleanSQLQuery(sqlQuery);
    
    console.log('Generated SQL Query:', sqlQuery); 

    db.query(sqlQuery, (err, rows) => {
      if (err) {
        console.error('SQL execution error:', err);  
        return res.status(500).json({ error: 'Database query failed', details: err });
      }

      console.log('Database query result:', rows); 

      res.json({ result: rows }); // Send the result back to the client
    });
  } catch (error) {
    console.error('GPT API or SQL generation error:', error);  
    res.status(500).json({ error: 'Failed to generate SQL query', details: error.message });
  }
});

app.post('/store-history', async (req, res) => {
  try {
    const { userInput, botResponse } = req.body;

    // Ensure both fields are present
    if (!userInput || !botResponse) {
      return res.status(400).json({ message: 'userInput and botResponse are required' });
    }

    // SQL query to insert into customer_queries table
    const sql = `INSERT INTO customer_queries (query_text, query_date, response_text) 
                 VALUES (?, NOW(), ?)`;

    const values = [userInput, botResponse];

    // Execute the query to insert the data
    db.query(sql, values, (error, result) => {
      if (error) {
        console.error('Error storing history in the database:', error);
        return res.status(500).json({ message: 'Database error' });
      }
      return res.status(200).json({ message: 'History stored successfully' });
    });
  } catch (err) {
    console.error('Error storing history:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});


// Backend route for fetching chat history
app.get('/fetch-history', async (req, res) => {
  try {
    const sqlQuery = 'SELECT query_text, query_date, response_text FROM customer_queries ORDER BY query_date DESC';
    db.query(sqlQuery, (error, rows) => {
      if (error) {
        console.error('Error fetching chat history:', error);
        return res.status(500).json({ message: 'Database error' });
      }
      res.status(200).json({ history: rows });
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
