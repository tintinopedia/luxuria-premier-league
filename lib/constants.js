export const PERMISSIONS = [
  { key: 'photos.add', label: 'Add Photos', group: 'Content' },
  { key: 'videos.add', label: 'Add Videos', group: 'Content' },
  { key: 'blogs.add', label: 'Add Blogs', group: 'Content' },
  { key: 'news.add', label: 'Add News', group: 'Content' },
  { key: 'users.approve', label: 'Approve Users', group: 'Users' },
  { key: 'users.delete', label: 'Delete Users', group: 'Users' },
  { key: 'users.create', label: 'Create Users', group: 'Users' },
  { key: 'users.edit', label: 'Edit Users', group: 'Users' },
  { key: 'roles.add', label: 'Add Roles', group: 'Roles' },
  { key: 'roles.delete', label: 'Delete Roles', group: 'Roles' },
  { key: 'roles.edit', label: 'Edit Roles', group: 'Roles' },
  { key: 'perms.add', label: 'Add Role Permissions', group: 'Role Permissions' },
  { key: 'perms.edit', label: 'Edit Role Permissions', group: 'Role Permissions' },
  { key: 'perms.delete', label: 'Delete Role Permissions', group: 'Role Permissions' },
  { key: 'perms.deactivate', label: 'Deactivate Role Permissions', group: 'Role Permissions' },
  { key: 'score.update', label: 'Update Ball-by-Ball Score', group: 'Scoring' },
  { key: 'score.edit', label: 'Edit Ball-by-Ball Score', group: 'Scoring' },
  { key: 'score.delete', label: 'Delete Ball-by-Ball Score', group: 'Scoring' },
  { key: 'commentary.update', label: 'Update Ball-by-Ball Commentary', group: 'Scoring' },
  { key: 'commentary.delete', label: 'Delete Ball-by-Ball Commentary', group: 'Scoring' },
  { key: 'teams.manage', label: 'Manage Teams & Members', group: 'League' },
  { key: 'tournaments.manage', label: 'Manage Tournaments & Matches', group: 'League' },
  { key: 'playingxi.manage', label: 'Confirm Playing XI', group: 'Match Day' },
];

export const SKILLS = ['Batsman', 'Bowler', 'Batting All-rounder', 'Bowling All-rounder', 'WicketKeeper-Batsman'];
export const BAT_STYLES = ['Right Hand', 'Left Hand'];
export const BOWL_STYLES = [
  'Right-arm Off-Spin', 'Right-arm Leg-Spin', 'Left-arm Off-Spin', 'Left-arm Leg-Spin',
  'Right-arm Medium Fast', 'Left-arm Medium Fast', 'Right-arm Fast', 'Left-arm Fast',
];
export const needsBat = (s) => !!s && s !== 'Bowler';
export const needsBowl = (s) => ['Bowler', 'Batting All-rounder', 'Bowling All-rounder'].includes(s);

// clockwise from the top (bowler's end), viewed from behind a right-hander
export const ZONES = ['Straight', 'Cover', 'Point', 'Third Man', 'Fine Leg', 'Mid-Wicket'];
// from the bowler's end down to the batter
export const LENGTHS = ['Half Line', 'Length', 'Good Length', 'Yorker', 'Full Toss'];
export const WICKETS = ['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Hit Wicket', 'Retired Out'];
export const BOWLER_CREDIT = ['Bowled', 'Caught', 'LBW', 'Stumped', 'Hit Wicket'];

export const CMS_TABS = [
  { href: '/cms/users', label: 'User Management', perms: ['users.approve', 'users.delete', 'users.create', 'users.edit'] },
  { href: '/cms/roles', label: 'Roles', perms: ['roles.add', 'roles.edit', 'roles.delete'] },
  { href: '/cms/permissions', label: 'Role Permissions', perms: ['perms.add', 'perms.edit', 'perms.delete', 'perms.deactivate'] },
  { href: '/cms/teams', label: 'Teams & Members', perms: ['teams.manage'] },
  { href: '/cms/tournaments', label: 'Tournaments & Matches', perms: ['tournaments.manage', 'playingxi.manage'] },
  { href: '/cms/content', label: 'News, Videos & Photos', perms: ['news.add', 'blogs.add', 'videos.add', 'photos.add'] },
];
export const ALL_CMS_PERMS = CMS_TABS.flatMap((t) => t.perms);
