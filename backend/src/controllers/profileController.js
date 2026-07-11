const db = require('../database');

const safeJSONParse = (value, defaultValue = []) => {
  if (!value || value === 'null' || value === 'undefined' || value === '') {
    return defaultValue;
  }
  try {
    return JSON.parse(value);
  } catch (e) {
    return defaultValue;
  }
};

const parseProfile = (profile) => {
  if (!profile) return null;
  profile.investmentInterests = safeJSONParse(profile.investmentInterests);
  profile.investmentStage = safeJSONParse(profile.investmentStage);
  profile.portfolioCompanies = safeJSONParse(profile.portfolioCompanies);
  profile.experience = safeJSONParse(profile.experience);
  profile.education = safeJSONParse(profile.education);
  profile.preferences = safeJSONParse(profile.preferences, {});
  return profile;
};

exports.getMyProfile = (req, res) => {
  const userId = parseInt(req.user.id, 10);
  
  db.get(`
    SELECT p.*, u.name, u.email, u.role, u.avatarUrl, u.bio, u.isOnline, u.createdAt 
    FROM profiles p 
    JOIN users u ON p.userId = u.id 
    WHERE p.userId = ?
  `, [userId], (err, profile) => {
    if (err) {
      console.error('getMyProfile error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    res.json({ success: true, profile: parseProfile(profile) });
  });
};

exports.updateProfile = (req, res) => {
  const userId = parseInt(req.user.id, 10);
  const body = req.body;

  const finishWithProfile = () => {
    db.get(`
      SELECT p.*, u.name, u.email, u.role, u.avatarUrl, u.bio, u.isOnline, u.createdAt 
      FROM profiles p 
      JOIN users u ON p.userId = u.id 
      WHERE p.userId = ?
    `, [userId], (err, profile) => {
      if (err) {
        console.error('updateProfile refetch error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
      }
      res.json({ success: true, profile: parseProfile(profile) });
    });
  };

  const updateUserFields = (cb) => {
    const userFields = [];
    const userValues = [];
    if (body.name !== undefined) { userFields.push('name = ?'); userValues.push(body.name); }
    if (body.bio !== undefined) { userFields.push('bio = ?'); userValues.push(body.bio); }
    if (body.avatarUrl !== undefined) { userFields.push('avatarUrl = ?'); userValues.push(body.avatarUrl); }

    if (userFields.length === 0) return cb();

    userValues.push(userId);
    db.run(`UPDATE users SET ${userFields.join(', ')} WHERE id = ?`, userValues, (err) => {
      if (err) {
        console.error('updateProfile users update error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
      }
      cb();
    });
  };

  // Get existing profile first
  db.get(`
    SELECT p.*, u.name, u.email, u.role, u.avatarUrl, u.bio, u.isOnline, u.createdAt 
    FROM profiles p 
    JOIN users u ON p.userId = u.id 
    WHERE p.userId = ?
  `, [userId], (err, existingProfile) => {
    if (err) {
      console.error('updateProfile get error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
    
    if (!existingProfile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const fields = [];
    const values = [];
    
    const addField = (name, value) => {
      if (value !== undefined) {
        fields.push(`${name} = ?`);
        values.push(Array.isArray(value) || typeof value === 'object' ? JSON.stringify(value) : value);
      }
    };
    
    addField('startupName', body.startupName);
    addField('pitchSummary', body.pitchSummary);
    addField('fundingNeeded', body.fundingNeeded);
    addField('industry', body.industry);
    addField('location', body.location);
    addField('foundedYear', body.foundedYear);
    addField('teamSize', body.teamSize);
    addField('investmentInterests', body.investmentInterests);
    addField('investmentStage', body.investmentStage);
    addField('portfolioCompanies', body.portfolioCompanies);
    addField('totalInvestments', body.totalInvestments);
    addField('minimumInvestment', body.minimumInvestment);
    addField('maximumInvestment', body.maximumInvestment);
    addField('website', body.website);
    addField('experience', body.experience);
    addField('education', body.education);
    addField('preferences', body.preferences);

    const hasUserFields = body.name !== undefined || body.bio !== undefined || body.avatarUrl !== undefined;

    if (fields.length === 0) {
      if (!hasUserFields) {
        return res.status(400).json({ success: false, message: 'No fields to update' });
      }
      return updateUserFields(finishWithProfile);
    }

    values.push(userId);
    
    db.run(`UPDATE profiles SET ${fields.join(', ')} WHERE userId = ?`, values, function(err) {
      if (err) {
        console.error('updateProfile run error:', err);
        return res.status(500).json({ success: false, message: 'Server error', error: err.message });
      }
      updateUserFields(finishWithProfile);
    });
  });
};

exports.getAllProfiles = (req, res) => {
  const { role } = req.query;
  let sql = `
    SELECT p.*, u.name, u.email, u.role, u.avatarUrl, u.bio, u.isOnline, u.createdAt 
    FROM profiles p 
    JOIN users u ON p.userId = u.id
  `;
  const params = [];
  
  if (role) {
    sql += ' WHERE u.role = ?';
    params.push(role);
  }

  db.all(sql, params, (err, profiles) => {
    if (err) {
      console.error('getAllProfiles error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
    profiles.forEach(p => parseProfile(p));
    res.json({ success: true, count: profiles.length, profiles });
  });
};

exports.getProfileById = (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  
  db.get(`
    SELECT p.*, u.name, u.email, u.role, u.avatarUrl, u.bio, u.isOnline, u.createdAt 
    FROM profiles p 
    JOIN users u ON p.userId = u.id 
    WHERE u.id = ?
  `, [userId], (err, profile) => {
    if (err) {
      console.error('getProfileById error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    res.json({ success: true, profile: parseProfile(profile) });
  });
};