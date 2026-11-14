const fs = require('fs');
const files = [
  'c:/Users/Youss/OneDrive/Desktop/final-grad/grad-118-Frontend/src/components/AddCardModal.jsx',
  'c:/Users/Youss/OneDrive/Desktop/final-grad/grad-118-Frontend/src/pages/Profile.jsx',
  'c:/Users/Youss/OneDrive/Desktop/final-grad/grad-118-Frontend/src/pages/BookWash.jsx'
];
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/href=\"data:image\/png;base64,([^\"]+)\"/g, (match, p1) => {
    return 'href=\"data:image/png;base64,' + p1.replace(/\s+/g, '') + '\"';
  });
  fs.writeFileSync(file, content, 'utf8');
});
console.log('Fixed base64 images!');
