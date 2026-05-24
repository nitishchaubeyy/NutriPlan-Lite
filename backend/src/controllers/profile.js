const profileService = require('../services/profile');
const { AppError } = require('../middleware/error');

/**
 * GET /api/v1/auth/profile
 * Retrieves the current authenticated user's profile.
 */
const getProfile = async (req, res, next) => {
  try {
    const profile = await profileService.getProfileByUserId(req.user.id);

    if (!profile) {
      return next(new AppError('Profile not found for this user.', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        profile
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/auth/profile
 * Updates the current authenticated user's profile.
 */
const updateProfile = async (req, res, next) => {
  try {
    const profile = await profileService.updateProfileByUserId(req.user.id, req.body);

    if (!profile) {
      return next(new AppError('Profile not found to update.', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        profile
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProfile,
  updateProfile
};
