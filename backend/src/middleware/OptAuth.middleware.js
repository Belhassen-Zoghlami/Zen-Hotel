const jwt = require('jsonwebtoken');
module.exports = (req,res,next) =>
{
    const token = req.cookies.token;
    if (!token)
    {
        req.user = null;
        return next();
    }
    // const token = authHeader.split(' ')[1];
    try 
    {
        const  decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
    }
    catch(err)
    {
        req.user = null;
    }
    next();
}