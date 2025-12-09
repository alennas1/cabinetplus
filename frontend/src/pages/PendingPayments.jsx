// Dentists.jsx
import React from 'react';

const PendingPayments = () => {
  return (
    <div style={styles.container}>
      <h1>This is the Pending Payments</h1>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f0f0f0',
  },
};

export default PendingPayments;
