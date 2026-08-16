const bcrypt=require('bcryptjs');
bcrypt.hash(process.argv[2] || 'ChangeMeNow!',12).then(console.log);
