/**
 * Testing Data
 */
const testData = {
  userId: '123e4567-e89b-12d3-a456-426614174000',
  email: 'bill.mate@diamondforge.fr',
  passwordShort: 'pass',
  passwordInvalid: 'password123',
  passwordValid: 'Password123',
  emailInvalid: 'invalid-email',
  firstName: 'Bill',
  lastName: 'Mate',
  confirmAccountToken:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImJpbGwubWF0ZUBkaWFtb25kZm9yZ2UuZnIiLCJzdWIiOiJjbWI4MWhrZjMwMDAwdDg0eGI5YmpscnNiIiwiZmlyc3RuYW1lIjoiQmlsbCIsImxhc3RuYW1lIjoiTWF0ZSIsImxvY2FsZSI6IkZSIiwiaWF0IjoxNzQ4NDQyNDQ0LCJleHAiOjE3NDkwNDcyNDR9.EbCtfmHe45W18fVf9nuf87ZgTqxJf6JaDGMbcCSqo3g',
  resetPasswordToken: 'reset-password-token'
}

const testApi = {
  interceptorURL: '**/api/auth/**',
  signIn: {
    URL: '**/api/auth/signin',
    success: {
      status: 200,
      body: { userId: testData.userId }
    },
    error: {
      status: 401,
      body: { message: 'Invalid email or password' }
    }
  },
  signUp: {
    URL: '**/api/auth/signup',
    success: {
      status: 200,
      body: { message: 'User registration successful. Please check your email for confirmation.' }
    }
  },
  signOut: {
    URL: '**/api/auth/signout',
    success: {
      status: 200,
      body: { message: 'User signed out successfully' }
    }
  },
  meAdmin: {
    URL: '**/api/auth/me',
    success: {
      status: 200,
      body: {
        userId: testData.userId,
        email: 'bill.mate@diamondforge.fr',
        people: {
          firstname: 'Bill',
          lastname: 'Mate'
        },
        roles: ['admin'],
        modules: ['ACCOUNT_ADMINISTRATION', 'ORGANIZATION_ADMINISTRATION', 'USER_ACCOUNT_PASSWORD_RECOVERY'],
        permissions: [
          'PASSWORD_RECOVERY_LINK_REQUEST_OWN',
          'PASSWORD_RECOVERY_RESET_OWN',
          'ACCOUNT_UPDATE',
          'ACCOUNT_USER_MANAGEMENT',
          'ACCOUNT_ENTITY_MANAGEMENT',
          'ENTITY_CREATION',
          'USER_ACCOUNTS_INVITATION',
          'USER_ENTITIES_INVITATION',
          'USER_ROLE_ALLOCATION',
          'ENTITY_USER_MANAGEMENT',
          'ORGANIZATION_CREATION',
          'ORGANIZATION_UPDATE'
        ],
        accounts: [
          {
            id: 'acc-123e4567-e89b-12d3-a456-426614174000',
            name: 'Main account',
            description: 'Default account for testing',
            isActive: true
          }
        ],
        entities: [
          {
            id: 'ent-123e4567-e89b-12d3-a456-426614174000',
            name: 'Test Entity',
            isActive: true,
            accountId: 'acc-123e4567-e89b-12d3-a456-426614174000',
            organization: {
              id: 'org-123e4567-e89b-12d3-a456-426614174000',
              name: 'Test Organization'
            }
          }
        ],
        createdAt: new Date().toISOString()
      }
    }
  },
  meUser: {
    URL: '**/api/auth/me',
    success: {
      status: 200,
      body: {
        userId: testData.userId,
        email: 'bill.mate@diamondforge.fr',
        people: {
          firstname: 'Bill',
          lastname: 'Mate'
        },
        roles: ['user'],
        modules: ['USER_ACCOUNT_PASSWORD_RECOVERY'],
        permissions: ['PASSWORD_RECOVERY_LINK_REQUEST_OWN', 'PASSWORD_RECOVERY_RESET_OWN']
      }
    }
  },
  guest: {
    URL: '**/api/auth/guest',
    success: {
      status: 200,
      body: {
        roles: ['guest'],
        modules: ['USER_ACCOUNT_CREATION', 'USER_ACCOUNT_PASSWORD_RECOVERY'],
        permissions: ['USER_ACCOUNT_CREATE_OWN']
      }
    }
  },
  resetPasswordRequest: {
    URL: '**/api/auth/request-password-reset',
    success: {
      status: 200,
      body: { message: 'Reset password link sent successfully', resetToken: 'test-reset-token' }
    },
    error: {
      status: 404,
      body: { message: 'User not found' }
    }
  },
  resetPassword: {
    URL: '**/api/auth/reset-password',
    success: {
      status: 200,
      body: { message: 'Password reset successful' }
    },
    error: {
      status: 400,
      body: { message: 'Invalid or expired token' }
    }
  }
}

/**
 * Flow Object Selectors
 */
const selectors = {
  dashboard: {
    URL: '/dashboard',
    cta: {
      userMenu: { name: /Bill Mate/i },
      account: { name: /Account management/i },
      signOut: { name: /Sign out/i }
    }
  },

  signIn: {
    URL: '/signin',
    successURL: /.*\/dashboard/,
    title: { name: /Sign in/i },
    cta: {
      validate: { name: /Sign in/i },
      forgotPassword: { name: /Forgot your password/i },
      signUp: { name: /Sign up/i }
    }
  },

  signUp: {
    URL: '/signup',
    title: { name: /Sign up/i },
    cta: {
      validate: { name: /Sign up/i },
      signIn: { name: /Sign in/i }
    },
    success: {
      title: /Account created successfully/i,
      subtitle: /Check your email for verification instructions/i,
      description: /We have sent an email containing a confirmation link/i,
      subdescription: /If you don't see the email, please check your spam folder/i
    }
  },

  resetPasswordRequest: {
    URL: '/reset-password-request',
    title: { name: /Reset password request/i },
    cta: {
      validate: { name: /Send reset password link/i },
      backToSignIn: { name: /Back to sign in/i }
    },
    success: {
      title: /Reset link sent/i,
      subtitle: /Check your email!/i,
      description: /If an account exists with the address/i,
      subdescription: /If you don't see the email, please check your spam folder/i
    }
  },

  resetPassword: {
    URL: '/reset-password',
    title: { name: /New password/i },
    description: /Update your password/i,
    cta: {
      validate: { name: /Update password/i },
      backToSignIn: { name: /Back to sign in/i },
      askForNewLink: { name: /Ask for a new reset password link/i }
    },
    success: {
      title: /Password updated successfully/i,
      subtitle: /Ready to sign in?/i,
      description: /You can now sign in with your new password./i
    }
  },

  fields: {
    firstName: /First name/i,
    lastName: /Last name/i,
    email: /Email/i,
    password: /Password/i,
    newPassword: /New password/i,
    confirmPassword: /Confirm password/i
  },

  errors: {
    requiredEmail: /Email is required/i,
    requiredPassword: /Password is required/i,
    invalidEmail: /Email is invalid/i,
    incorrectCredentials: /The provided credentials do not match any account/i,
    shortPassword: /Password must contain at least 6 characters/i,
    passwordComplexity: /Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number/i,
    requiredFirstName: /First name is required/i,
    requiredLastName: /Last name is required/i,
    requiredConfirmPassword: /Confirm password is required/i,
    passwordsDoNotMatch: /Passwords do not match/i,
    userAlreadyExists: /User already exists/i,
    missingToken: /A token password token is required to reset your password./i,
    invalidToken: /The token appears to be invalid./i
  }
}

export { selectors, testApi, testData }
