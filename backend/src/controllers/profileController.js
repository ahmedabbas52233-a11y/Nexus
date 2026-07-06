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

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    values.push(userId);
    
    db.run(`UPDATE profiles SET ${fields.join(', ')} WHERE userId = ?`, values, function(err) {
      if (err) {
        console.error('updateProfile run error:', err);
        return res.status(500).json({ success: false, message: 'Server error', error: err.message });
      }

      console.log('updateProfile - rows changed:', this.changes);

      // Merge existing profile with updates
      const updatedProfile = { ...existingProfile };
      
      if (body.startupName !== undefined) updatedProfile.startupName = body.startupName;
      if (body.pitchSummary !== undefined) updatedProfile.pitchSummary = body.pitchSummary;
      if (body.fundingNeeded !== undefined) updatedProfile.fundingNeeded = body.fundingNeeded;
      if (body.industry !== undefined) updatedProfile.industry = body.industry;
      if (body.location !== undefined) updatedProfile.location = body.location;
      if (body.foundedYear !== undefined) updatedProfile.foundedYear = body.foundedYear;
      if (body.teamSize !== undefined) updatedProfile.teamSize = body.teamSize;
      if (body.investmentInterests !== undefined) updatedProfile.investmentInterests = JSON.stringify(body.investmentInterests);
      if (body.investmentStage !== undefined) updatedProfile.investmentStage = JSON.stringify(body.investmentStage);
      if (body.portfolioCompanies !== undefined) updatedProfile.portfolioCompanies = JSON.stringify(body.portfolioCompanies);
      if (body.totalInvestments !== undefined) updatedProfile.totalInvestments = body.totalInvestments;
      if (body.minimumInvestment !== undefined) updatedProfile.minimumInvestment = body.minimumInvestment;
      if (body.maximumInvestment !== undefined) updatedProfile.maximumInvestment = body.maximumInvestment;
      if (body.website !== undefined) updatedProfile.website = body.website;
      if (body.experience !== undefined) updatedProfile.experience = JSON.stringify(body.experience);
      if (body.education !== undefined) updatedProfile.education = JSON.stringify(body.education);
      if (body.preferences !== undefined) updatedProfile.preferences = JSON.stringify(body.preferences);

      res.json({ success: true, profile: parseProfile(updatedProfile) });
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