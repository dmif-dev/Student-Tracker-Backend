import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const mentor = await prisma.mentor.findFirst();
    const student = await prisma.student.findFirst();
    if (!mentor || !student) {
        console.log("No mentor or student");
        return;
    }
    try {
        const session = await prisma.session.create({
            data: {
                studentId: student.id,
                mentorId: mentor.id,
                date: new Date(),
                startTime: '10:00 AM',
                endTime: '11:00 AM',
                topic: 'test',
                meetingLink: 'test',
                status: 'PENDING' as any
            },
            include: {
                student: {
                    select: {
                        name: true,
                        user: {
                            select: { id: true, email: true }
                        }
                    }
                },
                mentor: {
                    select: {
                        name: true,
                        user: {
                            select: { id: true, email: true }
                        }
                    }
                }
            }
        });
        console.log("Created", session.id);
    } catch(e) {
        console.error(e);
    }
}
main().finally(() => prisma.$disconnect());
