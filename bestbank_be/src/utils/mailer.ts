import nodemailer from 'nodemailer';

export async function sendVerificationEmail(toEmail: string, otp: string): Promise<void> {
    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SUPPLIER,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
    const verifyUrl = `${BASE_URL}/api/auth/verify?email=${encodeURIComponent(toEmail)}&otp=${otp}`;

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: toEmail,
        subject: 'Verify your BestBank account',
        html: `
            <p>Thank you for registering!</p>
            <p><a href="${verifyUrl}">Click here to verify your account</a></p>
        `,
    });
}
