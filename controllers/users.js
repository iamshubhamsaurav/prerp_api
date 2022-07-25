const catchAsync = require('../utils/catchAsync');
const User = require('../models/User');
const AppError = require('../utils/apiError');
const APIFeatures = require('../utils/apiFeatures');

exports.getUsers = catchAsync(async (req, res, next) =>  {
    const features = new APIFeatures(User.find(), req.query).sort().filter().limitField().paginate();
    const users = await features.query;
    res.status(200).send({
        success: true,
        count: users.length, 
        data: users
    });
});

exports.getUser = catchAsync(async (req, res, next) =>  {
    const user = await User.findById(req.params.id);
    if (!user) {
        return next(
            new AppError(`No Id found with the id of ${req.params.id}`, 404)
        );
    }
    res.status(200).send({
        success: true,
        data: user
    });
});

exports.createUser = catchAsync(async (req, res, next) =>  {
    const user = await User.create(req.body);
    res.status(200).send({
        success: true, 
        data: user,
    })
});

exports.updateUser = catchAsync(async (req, res, next) =>  {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });
    if (!user) {
        return next(new AppError(`No User found with id ${req.params.id}`, 404));
    }
    res.status(200).json({
        success: true,
        data: user,
    });
});

exports.deleteUser = catchAsync(async (req, res, next) =>  {
    const user = await User.findById(req.params.id);
    if (!user) {
        return next(new AppError(`No User found with id ${req.params.id}`, 404));
    }
    await user.remove();
    res.status(204).send({success: true, data: {}});
});


exports.updateMe = catchAsync(async (req, res, next) => {
    if (req.body.password || req.body.passwordConfirm) {
        return next(new AppError(`This route is not for password updates`, 400));
    }
    const {name, email} = req.body;
    // Update user document
    
    const updatedUser = await User.findByIdAndUpdate(req.user._id, {name, email}, {
        new: true,
        runValidators: true
    });
    // Send a response
    res.status(200).json({
        success: true,
        data: updatedUser
    });
});

exports.deleteMe = catchAsync(async (req, res, next) =>  {
    const password = req.body.password;
    let user = await User.findById(req.user._id).select('+password');

    if (!user.correctPassword(password, user.password)) {
        return next(new AppError('Your password is incorrect!', 401));
    }

    user = await User.findByIdAndUpdate(req.user._id, {active: false});

    res.status(204).json({
        success: true, 
        data: null,
        message: "User Deleted"
    })
})