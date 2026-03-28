// backend/src/routes/students.routes.ts
import { Router } from 'express';
import { StudentController } from '../controllers/student.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.middleware.js';
import { createStudentValidator, updateStudentValidator } from '../validators/student.validator.js';

const router = Router();
const studentController = new StudentController();

// Only Admins can manage the student roster comprehensively
router.use(authenticate, authorize('ADMIN'));

router.get('/', studentController.getAllStudents);
router.post('/', validate(createStudentValidator), studentController.createStudent);
router.get('/:id', studentController.getStudentById);
router.put('/:id', validate(updateStudentValidator), studentController.updateStudent);
router.delete('/:id', studentController.deleteStudent);

export default router;
