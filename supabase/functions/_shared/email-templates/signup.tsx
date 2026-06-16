/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email to start carpooling with Dolphin Carpool</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to Dolphin Carpool 🐬</Heading>
        <Text style={text}>
          Thanks for joining the{' '}
          <Link href={siteUrl} style={link}>
            <strong>Dolphin Carpool</strong>
          </Link>{' '}
          community! Please confirm your email (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) to activate your account.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirm my email
        </Button>
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
          Questions? Reach us at dolphincarpool@gmail.com.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0a2540', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#3c4858', lineHeight: '1.6', margin: '0 0 24px' }
const link = { color: '#0073e6', textDecoration: 'underline' }
const button = {
  backgroundColor: '#0073e6',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '10px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#8898aa', margin: '32px 0 0', lineHeight: '1.5' }
