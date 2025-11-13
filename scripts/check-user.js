const { User } = require('../src/models');
require('dotenv').config();

async function checkUser() {
  try {
    const users = await User.findAll({
      include: ['roles'],
      limit: 5
    });

    console.log('Users in database:');
    users.forEach(user => {
      console.log(`ID: ${user.id}, Email: ${user.email}, Enabled: ${user.enabled}`);
      console.log(`Roles: ${user.roles?.map(role => role.name).join(', ') || 'No roles'}`);
      console.log('---');
    });

    // Check user 44 specifically
    const user44 = await User.findByPk(44, { include: ['roles'] });
    if (user44) {
      console.log('User 44 details:');
      console.log(`Email: ${user44.email}`);
      console.log(`Enabled: ${user44.enabled}`);
      console.log(`Roles: ${user44.roles?.map(role => role.name).join(', ') || 'No roles'}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUser();