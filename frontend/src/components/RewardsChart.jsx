import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Box, Typography, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function RewardsChart({ data = [], title = '' }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    if (data && data.length > 0) {
      setChartData({
        labels: data.map(d => d.date || d.label),
        datasets: [
          {
            label: t('pendingRewards'),
            data: data.map(d => d.rewards || d.value),
            borderColor: theme.palette.primary.main,
            backgroundColor: `${theme.palette.primary.main}20`,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointBackgroundColor: theme.palette.primary.main,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: theme.palette.primary.main,
            pointHoverBorderWidth: 3,
          }
        ]
      });
    }
  }, [data, theme, t]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: theme.palette.text.primary,
          font: {
            size: 14,
            weight: 'bold',
            family: 'Roboto'
          },
          padding: 20
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: theme.palette.primary.main,
        bodyColor: '#fff',
        borderColor: theme.palette.primary.main,
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} ZAI`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: theme.palette.text.secondary,
          font: {
            size: 12
          },
          callback: function(value) {
            return value.toLocaleString() + ' ZAI';
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false
        }
      },
      x: {
        ticks: {
          color: theme.palette.text.secondary,
          font: {
            size: 12
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart'
    }
  };

  if (!chartData) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">{t('loading')}</Typography>
      </Box>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Box
        sx={{
          background: 'linear-gradient(135deg, rgba(0,31,63,0.4) 0%, rgba(0,15,30,0.6) 100%)',
          backdropFilter: 'blur(10px)',
          borderRadius: 3,
          p: 3,
          border: `1px solid ${theme.palette.primary.main}30`,
          boxShadow: `0 8px 32px ${theme.palette.primary.main}15`,
        }}
      >
        {title && (
          <Typography variant="h6" sx={{ mb: 3, color: theme.palette.primary.main, fontWeight: 'bold' }}>
            {title}
          </Typography>
        )}
        <Box sx={{ height: 300 }}>
          <Line data={chartData} options={options} />
        </Box>
      </Box>
    </motion.div>
  );
}

// 算力趋势图
export function PowerChart({ data = [], title = '' }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    if (data && data.length > 0) {
      setChartData({
        labels: data.map(d => d.date || d.label),
        datasets: [
          {
            label: t('totalPower'),
            data: data.map(d => d.power || d.value),
            borderColor: '#00BFFF',
            backgroundColor: 'rgba(0, 191, 255, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointBackgroundColor: '#00BFFF',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
          }
        ]
      });
    }
  }, [data, theme, t]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: theme.palette.text.primary,
          font: {
            size: 14,
            weight: 'bold'
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: theme.palette.text.secondary,
          callback: function(value) {
            return value.toLocaleString();
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        }
      },
      x: {
        ticks: {
          color: theme.palette.text.secondary
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        }
      }
    }
  };

  if (!chartData) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <Box
        sx={{
          background: 'linear-gradient(135deg, rgba(0,31,63,0.4) 0%, rgba(0,15,30,0.6) 100%)',
          backdropFilter: 'blur(10px)',
          borderRadius: 3,
          p: 3,
          border: '1px solid rgba(0, 191, 255, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 191, 255, 0.15)',
        }}
      >
        {title && (
          <Typography variant="h6" sx={{ mb: 3, color: '#00BFFF', fontWeight: 'bold' }}>
            {title}
          </Typography>
        )}
        <Box sx={{ height: 300 }}>
          <Line data={chartData} options={options} />
        </Box>
      </Box>
    </motion.div>
  );
}
