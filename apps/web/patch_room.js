const fs = require('fs');

function replaceRoomStorage(file) {
  let code = fs.readFileSync(file, 'utf-8');
  code = code.replace(/localStorage\.getItem\('codebattle_room'\)/g, "sessionStorage.getItem('codebattle_room')");
  code = code.replace(/localStorage\.setItem\('codebattle_room'/g, "sessionStorage.setItem('codebattle_room'");
  fs.writeFileSync(file, code);
}

replaceRoomStorage('src/app/battle/lobby/page.tsx');
replaceRoomStorage('src/app/battle/join/page.tsx');
replaceRoomStorage('src/app/battle/arena/page.tsx');
