const Event = require('../models/Event')
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/apiError');
const APIFeatures = require('../utils/apiFeatures');

// @route:       GET /api/v1/events/
// @desc:        Get all events.
// @access:      Public
exports.getEvents = catchAsync( async (req, res, next) => {
  const features = new APIFeatures(Event.find(), req.query).sort().filter().limitField().paginate();

  const events = await features.query;
    res
      .status(200)
      .json({ success: true, count: events.length, data: events });
});

// @route:       GET /api/v1/events/:id
// @desc:        Get a Event.
// @access:      Public
exports.getEvent = catchAsync( async (req, res, next) => {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return next(new AppError(`No event found with id ${req.params.id}`, 404));
    }
    res.status(200).json({
        success: true,
        data: event
    })
});

// @route:       POST /api/v1/events/
// @desc:        Create a Event.
// @access:      Private

exports.createEvent = catchAsync(async (req, res, next) => {
  if(req.user.role !== 'admin') {
    next(new AppError('You are not authorized', 401))
  }
  const event = await Event.create(req.body);
  res.status(201).json({ success: true, data: event });
});

// @route:       PUT /api/v1/event/:id
// @desc:        Update a event.
// @access:      Private
exports.updateEvent = catchAsync( async (req, res, next) => {
  let event = await Event.findById(req.params.id);
  
  if(req.user.role !== 'admin') {
    next(new AppError('You are not authorized', 401))
  }
    event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!event) {
      return next(new AppError(`No Event found with id ${req.params.id}`, 404));
    }
    res.status(200).json({ success: true, data: event });
});

// @route:       DELETE /api/v1/events/:id
// @desc:        Delete a event.
// @access:      Private
exports.deleteEvent = catchAsync( async (req, res, next) => {
  let event = await Event.findById(req.params.id);
  
  if(req.user.role !== 'admin') {
    next(new AppError('You are not authorized', 401))
  }
  
  event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return next(new AppError(`No event found with id ${req.params.id}`, 404));
    }
    res.status(200).json({ success: true, data: {} });
});