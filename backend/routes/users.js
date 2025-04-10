const User = require('../models/User');
 const InvitationCode = require('../models/InvitationCode');

 // @route   POST api/users
 // @desc    Register user (Signup)
 // @access  Public (Requires valid Invitation Code)
 router.post(
   '/',
   [
     // Input validation rules
     check('name', 'Name is required').not().isEmpty(),
     check('email', 'Please include a valid email').isEmail(),
     check('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
     check('invitationCode', 'Invitation code is required').not().isEmpty(),
   ],
   async (req, res) => {
     // Check validation results
     const errors = validationResult(req);
     if (!errors.isEmpty()) {
       // Return first error message for simplicity
       return res.status(400).json({ message: errors.array()[0].msg });
     }

     const { name, email, password, invitationCode } = req.body;

     try {
       // Check Invitation Code first (as before)
       const code = await InvitationCode.findOne({ code: invitationCode });

       // Provide more specific error messages for invitation code issues
       if (!code) {
            return res.status(400).json({ message: 'Invalid invitation code' });
       }
       if (code.isUsed) {
            return res.status(400).json({ message: 'Invitation code has already been used' });
       }
       if (code.expiryDate && code.expiryDate < new Date()) {
            return res.status(400).json({ message: 'Invitation code has expired' });
       }
       // Original check:
       // if (!code || code.isUsed || (code.expiryDate && code.expiryDate < new Date())) {
       //      return res.status(400).json({ message: 'Invalid or already used invitation code' });
       // }


       // See if user exists *after* validating code
       let user = await User.findOne({ email });
       if (user) {
         return res.status(400).json({ message: 'User already exists with this email' });
       }

       // Create new user instance
       user = new User({ name, email, password });

       // Hash password
       const salt = await bcrypt.genSalt(10);
       user.password = await bcrypt.hash(password, salt);

       // Save user to DB
       await user.save();

       // Mark invitation code as used *after* user is successfully saved
       code.isUsed = true;
       code.usedBy = user._id; // Link the code to the user who used it
       await code.save();

       // Return jsonwebtoken (Payload, Secret, Options)
       const payload = {
         user: {
           id: user.id, // Use user.id (Mongoose virtual)
         },
       };

       jwt.sign(
         payload,
         process.env.JWT_SECRET,
         { expiresIn: '5 days' }, // Token expiry
         (err, token) => {
           if (err) throw err;
           // Return token and user info (excluding password) upon successful signup
           res.json({
             token,
             user: { id: user.id, name: user.name, email: user.email },
            });
         }
       );
     } catch (err) {
       console.error('Signup Server Error:', err.message); // Log the actual error
       res.status(500).send('Server error during signup'); // Generic message to client
     }
   }
 );

 module.exports = router;
 ```