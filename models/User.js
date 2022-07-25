const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const UserSchema = mongoose.Schema({
    name: { 
        type: String, 
        required: [true, "Please add your name"],
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Please add email address"],
        lowercase: true,
        unique: true,
        validate: [validator.isEmail, "Please enter a valid email address"]
    },
    photo: String,
    password: {
        type: String,
        minLength: 8,
        required: [true, "Please add password"],
        select: false
    },
    passwordConfirm: {
        type: String,
        required: [true, "Please confirm your password."],
        validate: {
            // This only works for onCreate or onSave. Will not work for update
            validator: function(el) {
                return el === this.password;
            },
            message: "Passwords are not the same!"
        }
    },
    role: {
        type: String,
        enum: ['student', 'faculty', 'admin'],
        default: 'student',
    },
    course: {
        type: String,
        required: [true, "Please add your course"],
        enum: ['bca', 'bba', 'bcom', 'mca', 'mba', 'mcom']
    },
    semester: {
        type: String,
        default: "1",
    },
    active: {
        type: Boolean,
        default: true,
        select: false
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetTokenExpiresIn: Date,
});

// /^find/ :  It means that every query that starts with find
UserSchema.pre(/^find/, function (next) {
    // This points to the current query
    // {$ne: false}: It means not equal to false
    this.find({active: {$ne: false}});
    next();
});

UserSchema.pre('save', async function(next) {
    // Only hash the password if the password was modified
    if (!this.isModified('password')) {
        return next();
    }
    //  Hashing the password
    this.password = await bcrypt.hash(this.password, 12);
    // Deleting the passwordConfirm.
    this.passwordConfirm = undefined;
    next();
})

UserSchema.pre('save', function (next){
    if (!this.isModified('password') || this.isNew) {
        return next();
    }
    // Subtract 1 sec here, cause sometime passwordChangedAt will be saved to DB a bit after the token has been issued and the user will not be able to log in cuz again the passwordChangedAt is set a sec after the token has been issued
    this.passwordChangedAt = Date.now() - 1000;
    next();
});

UserSchema.methods.correctPassword = async function(candiatePassword, userPassword) {
    // this.password will not work cause select: false
    return await bcrypt.compare(candiatePassword, userPassword);
}

UserSchema.methods.changedPasswordAfter = function(JWTTimeStamp) {
    if (this.passwordChangedAt) {
        
        const changedTimestamp = parseInt( this.passwordChangedAt.getTime() / 1000, 10);
    // console.log(changedTimestamp, JWTTimeStamp);
    return  JWTTimeStamp < changedTimestamp;
    // Checking if the passwordChangedAt is greater than the iat of incoming token 
    }
    return false;
}

UserSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    this.passwordResetTokenExpiresIn = Date.now() + 10 * 60 * 1000;
    return resetToken;
}

const User = mongoose.model('User', UserSchema);

module.exports = User;