import { Container, Typography, Box, Card, CardContent, Button } from '@mui/material'
import { toast } from 'react-toastify'

function Referral({ account }) {
  const referralLink = account ? `${window.location.origin}?ref=${account}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied!');
  };

  if (!account) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ color: '#B0B8C4' }}>
          Connect wallet to view referral system
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h3" sx={{ mb: 4, color: '#FFD700', fontWeight: 700 }}>
        Referral System
      </Typography>

      <Card className="financial-card">
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#FFD700' }}>
            Your Referral Link
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
            <Typography
              sx={{
                flex: 1,
                p: 2,
                background: '#0A0E17',
                borderRadius: 1,
                color: '#B0B8C4',
                wordBreak: 'break-all'
              }}
            >
              {referralLink}
            </Typography>
            <Button
              variant="contained"
              onClick={copyLink}
              sx={{
                background: 'linear-gradient(135deg, #FFD700, #FFC700)',
                color: '#001F3F',
                fontWeight: 700
              }}
            >
              Copy
            </Button>
          </Box>

          <Typography variant="body2" sx={{ color: '#B0B8C4', mb: 2 }}>
            Earn rewards from your referrals:
          </Typography>
          <Typography variant="body2" sx={{ color: '#FFD700' }}>
            • Level 1 (Direct): 5% of rewards
          </Typography>
          <Typography variant="body2" sx={{ color: '#FFD700' }}>
            • Level 2: 3% of rewards
          </Typography>
          <Typography variant="body2" sx={{ color: '#FFD700' }}>
            • Level 3: 1% of rewards
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}

export default Referral
