import Student from './Student.js';
import Teacher from './Teacher.js';
import Admin from './Admin.js';

const MODELS = { STUDENT: Student, TEACHER: Teacher, ADMIN: Admin };

/**
 * Get the account model for the given account type (for use with req.accountType from JWT).
 */
export function getAccountModel(accountType) {
  const model = MODELS[accountType];
  if (!model) {
    throw new Error(`Unknown account type: ${accountType}`);
  }
  return model;
}

export { Student, Teacher, Admin };
