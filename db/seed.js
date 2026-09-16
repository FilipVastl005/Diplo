'use strict';

const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

async function seedDatabase(db) {
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (count.c > 0) return;

  console.log('Seeding database with demo data...');

  const adminHash    = await bcrypt.hash('Admin123!',   SALT_ROUNDS);
  const teacherHash  = await bcrypt.hash('Teacher123!', SALT_ROUNDS);
  const studentHash  = await bcrypt.hash('Student123!', SALT_ROUNDS);

  const ins = db.prepare(`
    INSERT INTO users (username, password_hash, role, first_name, last_name, email, class_name, avatar_color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const adminId    = ins.run('admin',        adminHash,   'admin',   'Admin',    'Systemu', 'admin@diplo.cz',      null,  '#dc2626').lastInsertRowid;
  const ivanaId    = ins.run('ivana.potul',  teacherHash, 'teacher', 'Ivana',    'Potul',   'i.potul@diplo.cz',    null,  '#2563eb').lastInsertRowid;
  const pavelId    = ins.run('pavel.otec',   teacherHash, 'teacher', 'Pavel',    'Otec',    'p.otec@diplo.cz',     null,  '#16a34a').lastInsertRowid;
  const janManaId  = ins.run('jan.mana',     teacherHash, 'teacher', 'Jan',      'Mana',    'j.mana@diplo.cz',     null,  '#d97706').lastInsertRowid;
  const matildaId  = ins.run('matilda.kopa', teacherHash, 'teacher', 'Matilda',  'Kopa',    'm.kopa@diplo.cz',     null,  '#db2777').lastInsertRowid;

  const pokolnyId  = ins.run('jan.pokolny',  studentHash, 'student', 'Jan',      'Pokolny', 'j.pokolny@diplo.cz',  '3A', '#7c3aed').lastInsertRowid;
  const novaId     = ins.run('marie.nova',   studentHash, 'student', 'Marie',    'Nova',    'm.nova@diplo.cz',     '3A', '#0891b2').lastInsertRowid;
  const dvorakId   = ins.run('petr.dvorak',  studentHash, 'student', 'Petr',     'Dvorak',  'p.dvorak@diplo.cz',   '3B', '#65a30d').lastInsertRowid;
  const horakId    = ins.run('jana.horak',   studentHash, 'student', 'Jana',     'Horak',   'j.horak@diplo.cz',    '3B', '#c2410c').lastInsertRowid;

  // Subjects
  const insSub = db.prepare('INSERT INTO subjects (name, short_name, teacher_id, room) VALUES (?, ?, ?, ?)');
  const matId  = insSub.run('Matematika',         'MAT', ivanaId,   'A18').lastInsertRowid;
  const prgId  = insSub.run('Programovani',        'Prg', pavelId,   'D132').lastInsertRowid;
  const fyzId  = insSub.run('Fyzika',              'Fyz', ivanaId,   'A18').lastInsertRowid;
  const opsId  = insSub.run('Operacni systemy',    'Ops', janManaId, 'S15').lastInsertRowid;
  const cesId  = insSub.run('Cestina',             'Ces', matildaId, 'B204').lastInsertRowid;
  const anjId  = insSub.run('Anglictina',          'Anj', matildaId, 'B206').lastInsertRowid;

  // Enrollments
  const enroll = db.prepare('INSERT INTO enrollments (student_id, subject_id) VALUES (?, ?)');
  [matId, prgId, fyzId, opsId, cesId, anjId].forEach(sid => {
    enroll.run(pokolnyId, sid);
    enroll.run(novaId, sid);
  });
  [matId, prgId, fyzId, opsId].forEach(sid => {
    enroll.run(dvorakId, sid);
    enroll.run(horakId, sid);
  });

  // Grades
  const insGrade = db.prepare(`
    INSERT INTO grades (student_id, subject_id, grade, weight, description, date, graded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insGrade.run(pokolnyId, matId, 2, 3, 'Pisemna prace - polynomy',     '2026-09-10', ivanaId);
  insGrade.run(pokolnyId, fyzId, 4, 1, 'Test - mechanika',             '2026-09-08', ivanaId);
  insGrade.run(pokolnyId, prgId, 3, 2, 'Algoritmizace - ukol',         '2026-09-05', pavelId);
  insGrade.run(pokolnyId, opsId, 1, 4, 'Semestralka',                  '2026-09-12', janManaId);
  insGrade.run(pokolnyId, cesId, 2, 2, 'Sloh - popis',                 '2026-09-03', matildaId);
  insGrade.run(pokolnyId, anjId, 1, 3, 'Speaking test',                '2026-09-01', matildaId);
  insGrade.run(pokolnyId, matId, 3, 1, 'Cteni z grafu',                '2026-08-28', ivanaId);

  insGrade.run(novaId, matId, 1, 3,  'Pisemna prace - polynomy',       '2026-09-10', ivanaId);
  insGrade.run(novaId, fyzId, 2, 1,  'Test - mechanika',               '2026-09-08', ivanaId);
  insGrade.run(novaId, prgId, 1, 2,  'Algoritmizace - ukol',           '2026-09-05', pavelId);
  insGrade.run(novaId, cesId, 1, 2,  'Sloh - popis',                   '2026-09-03', matildaId);
  insGrade.run(novaId, anjId, 1, 3,  'Speaking test',                  '2026-09-01', matildaId);

  insGrade.run(dvorakId, matId, 3, 3, 'Pisemna prace - polynomy',      '2026-09-10', ivanaId);
  insGrade.run(dvorakId, fyzId, 5, 1, 'Test - mechanika',              '2026-09-08', ivanaId);
  insGrade.run(dvorakId, prgId, 2, 2, 'Algoritmizace - ukol',          '2026-09-05', pavelId);
  insGrade.run(dvorakId, opsId, 3, 4, 'Semestralka',                   '2026-09-12', janManaId);

  insGrade.run(horakId, matId, 2, 3,  'Pisemna prace - polynomy',      '2026-09-10', ivanaId);
  insGrade.run(horakId, fyzId, 3, 1,  'Test - mechanika',              '2026-09-08', ivanaId);
  insGrade.run(horakId, prgId, 2, 2,  'Algoritmizace - ukol',          '2026-09-05', pavelId);
  insGrade.run(horakId, opsId, 2, 4,  'Semestralka',                   '2026-09-12', janManaId);

  // Notifications
  const insNotif = db.prepare('INSERT INTO notifications (teacher_id, content, target_class) VALUES (?, ?, ?)');
  insNotif.run(ivanaId,   'Priste budeme psat pisemku z kvadratickych rovnic. Prosim nastudujte kapitolu 5 ze sbirky prikladu.', null);
  insNotif.run(pavelId,   'Odevzdani projektu je zitru do 23:59. Poslete ZIP soubor na email.', '3A');
  insNotif.run(janManaId, 'Hodina v patek bude v ucebne S20 kvuli oprave klimatizace v S15.', null);
  insNotif.run(matildaId, 'Zverejnila jsem opravenou pisemku ve slozce na sdilenem disku tridy.', '3A');
  insNotif.run(ivanaId,   'Pozor: v pondeli bude suplovat pan Novak misto me. Prace budou na tabuli.', null);
  insNotif.run(pavelId,   'Kdo nema nainstalovan Git, at se postara do pte. Jinak nepujde pracovat na projektu.', '3B');

  // Events
  const insEvent = db.prepare(`
    INSERT INTO events (title, description, event_date, event_time, location, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insEvent.run('Skolni ples',                'Tradicni skolni ples v aule. Dresscode: elegantni.',         '2026-10-15', '19:00', 'Aula',             adminId);
  insEvent.run('Pisemne maturitni zkousky',  'Statem organizovane maturitni zkousky. Prilozte obcanku.',   '2026-11-10', '08:00', 'Vsechny tridy',    adminId);
  insEvent.run('Exkurze - Praha',            'Exkurze do Narodniho muzea. Obed na vlastni naklady.',       '2026-09-28', '07:30', 'Sraz pred skolou', ivanaId);
  insEvent.run('Rodic-ucitel konference',    'Setkani rodicu s trididnimi uciteli. 10 min na rodinu.',     '2026-10-05', '16:00', 'Tridy',            adminId);
  insEvent.run('Sportovni den',              'Mezitridni souteze - atletika, volejbal, fotbal.',            '2026-10-22', '09:00', 'Sportovisite',     adminId);

  // Schedule - class 3A
  const insSched = db.prepare('INSERT INTO schedule (subject_id, day_of_week, period, class_name) VALUES (?, ?, ?, ?)');
  // Monday
  insSched.run(matId, 0, 1, '3A'); insSched.run(matId, 0, 2, '3A');
  insSched.run(prgId, 0, 3, '3A'); insSched.run(cesId, 0, 4, '3A');
  insSched.run(anjId, 0, 5, '3A');
  // Tuesday
  insSched.run(fyzId, 1, 1, '3A'); insSched.run(fyzId, 1, 2, '3A');
  insSched.run(opsId, 1, 3, '3A'); insSched.run(prgId, 1, 4, '3A');
  insSched.run(cesId, 1, 5, '3A');
  // Wednesday
  insSched.run(matId, 2, 1, '3A'); insSched.run(cesId, 2, 2, '3A');
  insSched.run(anjId, 2, 3, '3A'); insSched.run(anjId, 2, 4, '3A');
  insSched.run(opsId, 2, 5, '3A');
  // Thursday
  insSched.run(prgId, 3, 1, '3A'); insSched.run(prgId, 3, 2, '3A');
  insSched.run(opsId, 3, 3, '3A'); insSched.run(matId, 3, 4, '3A');
  // Friday
  insSched.run(fyzId, 4, 1, '3A'); insSched.run(cesId, 4, 2, '3A');
  insSched.run(opsId, 4, 3, '3A'); insSched.run(matId, 4, 4, '3A');

  // Schedule - class 3B
  insSched.run(matId, 0, 1, '3B'); insSched.run(prgId, 0, 2, '3B');
  insSched.run(opsId, 0, 3, '3B'); insSched.run(fyzId, 0, 4, '3B');
  insSched.run(matId, 1, 1, '3B'); insSched.run(matId, 1, 2, '3B');
  insSched.run(prgId, 1, 3, '3B'); insSched.run(prgId, 1, 4, '3B');
  insSched.run(opsId, 2, 1, '3B'); insSched.run(fyzId, 2, 2, '3B');
  insSched.run(matId, 2, 3, '3B');
  insSched.run(matId, 3, 1, '3B'); insSched.run(opsId, 3, 2, '3B');
  insSched.run(prgId, 3, 3, '3B'); insSched.run(fyzId, 3, 4, '3B');
  insSched.run(prgId, 4, 1, '3B'); insSched.run(fyzId, 4, 2, '3B');
  insSched.run(matId, 4, 3, '3B'); insSched.run(opsId, 4, 4, '3B');

  // Chat messages
  const insChat = db.prepare('INSERT INTO chat_messages (sender_id, room, content) VALUES (?, ?, ?)');
  insChat.run(pokolnyId, 'general', 'Ahoj vsichni, kdo dela ukoly z matiky?');
  insChat.run(novaId,    'general', 'Ja, je to dost tezke...');
  insChat.run(pokolnyId, 'general', 'Priklady 3 az 7 jsou hrozne, pomoci si?');
  insChat.run(novaId,    'general', 'Jasne, muzeme zkusit po skole.');
  insChat.run(dvorakId,  '3B',      'Kdy mame odevzdat projekt z Prg?');
  insChat.run(horakId,   '3B',      'Myslim ze zitru do pulnoci.');
  insChat.run(dvorakId,  '3B',      'Diky, jeste nemam hotove testovani...');

  console.log('Database seeded successfully.');
  console.log('Accounts: admin/Admin123! | ivana.potul/Teacher123! | jan.pokolny/Student123!');
}

module.exports = { seedDatabase };
