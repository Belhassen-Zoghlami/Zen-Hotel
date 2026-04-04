require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');
const admincreation = require('./src/config/createAdmin');
connectDB();
admincreation();


// app.get('/', (req,res)=>
// {
//   res.send("welcome");
// })
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
