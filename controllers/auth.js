const crypto = require('crypto');
const { promisify } = require('util');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/apiError');
const sendMail = require('../utils/email');

const signToken = id => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    })
}

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);
    res.status(statusCode).json({
        success: true,
        token,
        data: user,
    });
}

// Commented as User will be created from the backend
// exports.signup = catchAsync(async (req, res, next) => {
//     const user = await User.create({
//         name: req.body.name,
//         email: req.body.email,
//         password: req.body.password, 
//         passwordConfirm: req.body.passwordConfirm,
//     });
//     createSendToken(user, 201, res);
// })

exports.login = catchAsync(async (req, res, next) => {
    const {email, password} = req.body;
    //Check if email and password exist
    if (!email || !password) {
        return next(new AppError(`Please provide an email and password`, 400));
    }
    // Check if the user exists and password is correct
    const user = await User.findOne({email}).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
        // 401 stands for not authenticated
        return next(new AppError(`Incorrect Email or Password`, 401));
    }
    // If everything Ok send back the jsonwebtoken
    const token  = signToken(user._id); // Signing the token

    res.status(200).json({
        success: true,
        token
    })
})

exports.protect = catchAsync(async (req, res, next) =>  {
    // Get the Token and check if it exists
    // console.log(req.headers);
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    console.log(token);
    if (!token) {
        return next(new AppError('You are not logged in. Please log in to get access', 401));
    }
    // Verify The Token
    const decoded = await promisify( jwt.verify)(token, process.env.JWT_SECRET);
    console.log(decoded);
    // Check if the user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
        return next(new AppError('The user belonging to the token does not exist.', 401));
    }
    // Check if the user changed password after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
        return next(new AppError('User recently changed the password. Please login again', 401));
    }
    
    req.user = user;
    next();
})

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError('You are not authorized to access this route.', 403));
        }

        next();
    };
}

exports.forgotPassword = catchAsync(async (req, res, next) =>  {
    // Getting the user from email
    const user = await User.findOne({email: req.body.email});
    if (!user) {
        return next(new AppError(`There is no user with email address ${req.body.email}`, 404));
    }
    // Send back the token
    const resetToken = user.createPasswordResetToken();
    // save the user to persist the encrypted token in db
    await user.save({ validateBeforeSave: false });

    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetpassword/${resetToken}`;
    const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to the URL: ${resetURL}.\nIf you didn't forget your password then ignore this email.`;

    try {
        await sendMail({
            email: user.email,
            subject: `Your password reset token.(Valid for 10 min)`,
            message: message,
        });
        res.status(200).json({
            success: true, 
            message: 'Token sent to email.'
        });
    } catch (error) {
        user.passwordResetToken = undefined;
        user.passwordResetTokenExpiresIn = undefined;
        user.save({validateBeforeSave: false});
        
        return next(new AppError('There was an error sending this email. Try again later.', 500))
    }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    // Get user based on token
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({passwordResetToken: hashedToken, passwordResetTokenExpiresIn: {$gt: Date.now()}});
    // If token is not expired, and there is a user, set the new password
    if (!user) {
        return next(new AppError('Token is invalid or has expired.', 400));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpiresIn = undefined;

    await user.save();
    // update changedPasswordAt property
    // Done by writing a pre middleware in UserSchema
    
    // Log the user in, Send JWT
    const token = signToken(user._id);
    res.status(200).json({
        success: true,
        token,
    })
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    const {currentPassword, newPassword, newPasswordConfirm} = req.body;
    // Get user from the database
    const user  = await User.findById(req.user._id).select('+password');
    // Check if the password is correct
    if (!user.correctPassword(currentPassword, user.password)) {
        return next(new AppError(`password is incorrect!`, 401));
    }
    // update the password
    user.password = newPassword;
    user.passwordConfirm = newPasswordConfirm;
    await user.save();
    // log the user in
    const token = signToken(user._id);
    res.status(200).json({ token });
});