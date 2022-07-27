const Update = require('../models/Update')
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/apiError');
const APIFeatures = require('../utils/apiFeatures');

// @route:       GET /api/v1/updates/
// @desc:        Get all updates.
// @access:      Public
exports.getUpdates = catchAsync( async (req, res, next) => {
  const features = new APIFeatures(Update.find(), req.query).sort().filter().limitField().paginate();

  const updates = await features.query;
    res
      .status(200)
      .json({ success: true, count: updates.length, data: updates });
});

// @route:       GET /api/v1/updates/:id
// @desc:        Get a Update.
// @access:      Public
exports.getUpdate = catchAsync( async (req, res, next) => {
    const update = await Update.findById(req.params.id);
    if (!update) {
      return next(new AppError(`No update found with id ${req.params.id}`, 404));
    }
    res.status(200).json({
        success: true,
        data: update
    })
});

// @route:       POST /api/v1/updates/
// @desc:        Create a update.
// @access:      Private

exports.createUpdate = catchAsync(async (req, res, next) => {
  if(req.user.role !== 'admin') {
    next(new AppError('You are not authorized', 401))
  }
  const update = await Update.create(req.body);
  res.status(201).json({ success: true, data: update });
});

// @route:       PUT /api/v1/updates/:id
// @desc:        Update a update.
// @access:      Private
exports.updateUpdate = catchAsync( async (req, res, next) => {
  let update = await Update.findById(req.params.id);
  
  if(req.user.role !== 'admin') {
    next(new AppError('You are not authorized', 401))
  }
  update = await Update.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!update) {
      return next(new AppError(`No update found with id ${req.params.id}`, 404));
    }
    res.status(200).json({ success: true, data: update });
});

// @route:       DELETE /api/v1/updates/:id
// @desc:        Delete a update.
// @access:      Private
exports.deleteUpdate = catchAsync( async (req, res, next) => {
  let update = await Update.findById(req.params.id);
  
  if(req.user.role !== 'admin') {
    next(new AppError('You are not authorized', 401))
  }
  
  update = await Update.findByIdAndDelete(req.params.id);
    if (!update) {
      return next(new AppError(`No update found with id ${req.params.id}`, 404));
    }
    res.status(200).json({ success: true, data: {} });
});