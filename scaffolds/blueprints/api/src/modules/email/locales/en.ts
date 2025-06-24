export const en = {
  accountConfirmation: {
    subject: 'Confirm your SaaSFoundry account',
    title: 'Welcome to SaaSFoundry!',
    greeting: 'Hello',
    body: 'Thank you for signing up to SaaSFoundry. To activate your account, please click the button below:',
    button: 'Activate my account',
    fallback: "If the button doesn't work, you can copy and paste the following link into your browser:",
    ignore: "If you didn't create a SaaSFoundry account, you can ignore this email.",
    footer: 'This email was sent automatically. Please do not reply.'
  },
  passwordReset: {
    subject: 'Reset your SaaSFoundry password',
    title: 'Password Reset',
    greeting: 'Hello',
    body: 'You have requested to reset your password. Click the button below to create a new one:',
    button: 'Reset my password',
    fallback: "If the button doesn't work, you can copy and paste the following link into your browser:",
    ignore: "If you didn't request this reset, you can ignore this email.",
    expiration: 'This link will expire in 1 hour.',
    footer: 'This email was sent automatically. Please do not reply.'
  },
  invitation: {
    subject: 'You have been invited to join SaaSFoundry',
    title: 'You have been invited to join SaaSFoundry',
    greeting: 'Hello',
    bodyWithName: '{inviterName} has invited you to join the SaaSFoundry platform. Click the button below to accept the invitation and set up your account.',
    bodyWithoutName: 'An administrator has invited you to join the SaaSFoundry platform. Click the button below to accept the invitation and set up your account.',
    button: 'Accept invitation',
    fallback: "If the button doesn't work, you can copy and paste the following link into your browser:",
    expiration: 'This link will expire in 7 days.',
    ignore: "If you didn't request to join SaaSFoundry, you can ignore this email.",
    footer: '© {year} SaaSFoundry. All rights reserved.'
  }
}
