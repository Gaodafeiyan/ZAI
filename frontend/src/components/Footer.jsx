import { Box, Container, Typography, Link, Grid } from '@mui/material'
import { GitHub, Twitter, Telegram } from '@mui/icons-material'

function Footer() {
  return (
    <Box sx={{ background: '#001F3F', py: 6, mt: 8, borderTop: '1px solid rgba(255,215,0,0.2)' }}>
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" sx={{ color: '#FFD700', fontWeight: 700, mb: 2 }}>
              ZENITHUS
            </Typography>
            <Typography variant="body2" sx={{ color: '#B0B8C4', lineHeight: 1.8 }}>
              30-Year AI Mining Protocol on BSC.
              <br />
              Decentralized. Sustainable. Transparent.
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="h6" sx={{ color: '#FFD700', fontWeight: 700, mb: 2 }}>
              Quick Links
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="https://bscscan.com/address/0xA49c95d8B262c3BD8FDFD6A602cca9db21377605" target="_blank" sx={{ color: '#B0B8C4', textDecoration: 'none', '&:hover': { color: '#FFD700' } }}>
                ZAI Contract
              </Link>
              <Link href="https://bscscan.com/address/0xb3300A66b1D098eDE8482f9Ff40ec0456eb5b83B" target="_blank" sx={{ color: '#B0B8C4', textDecoration: 'none', '&:hover': { color: '#FFD700' } }}>
                Mining Contract
              </Link>
              <Link href="https://pancakeswap.finance" target="_blank" sx={{ color: '#B0B8C4', textDecoration: 'none', '&:hover': { color: '#FFD700' } }}>
                PancakeSwap
              </Link>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="h6" sx={{ color: '#FFD700', fontWeight: 700, mb: 2 }}>
              Community
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Link href="#" sx={{ color: '#B0B8C4', '&:hover': { color: '#FFD700' } }}>
                <GitHub />
              </Link>
              <Link href="#" sx={{ color: '#B0B8C4', '&:hover': { color: '#FFD700' } }}>
                <Twitter />
              </Link>
              <Link href="#" sx={{ color: '#B0B8C4', '&:hover': { color: '#FFD700' } }}>
                <Telegram />
              </Link>
            </Box>
          </Grid>
        </Grid>

        <Typography variant="body2" sx={{ color: '#B0B8C4', textAlign: 'center', mt: 4, pt: 4, borderTop: '1px solid rgba(255,215,0,0.1)' }}>
          © 2025 Zenithus Protocol. All rights reserved. | Powered by BSC
        </Typography>
      </Container>
    </Box>
  );
}

export default Footer
