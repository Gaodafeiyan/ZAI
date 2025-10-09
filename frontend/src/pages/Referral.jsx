import { Container, Typography, Box, Card, CardContent, Button } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'

function Referral({ account }) {
  const { t } = useTranslation();
  const referralLink = account ? `${window.location.origin}?ref=${account}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('推荐链接已复制！');
  };

  if (!account) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ color: '#B0B8C4' }}>
          {t('connectWallet')}查看推荐系统
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h3" sx={{ mb: 4, color: '#FFD700', fontWeight: 700 }}>
        {t('referral')}系统
      </Typography>

      <Card className="financial-card">
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#FFD700' }}>
            {t('referralLink')}
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
              {t('copyLink')}
            </Button>
          </Box>

          <Typography variant="body2" sx={{ color: '#B0B8C4', mb: 2 }}>
            从您的推荐中获得奖励：
          </Typography>
          <Typography variant="body2" sx={{ color: '#FFD700' }}>
            • {t('level1')}：直推奖励的 5%
          </Typography>
          <Typography variant="body2" sx={{ color: '#FFD700' }}>
            • {t('level2')}：间推奖励的 3%
          </Typography>
          <Typography variant="body2" sx={{ color: '#FFD700' }}>
            • {t('level3')}：三级奖励的 1%
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}

export default Referral
