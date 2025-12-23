const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Terjadi kesalahan internal pada server';

    res.status(statusCode).json({
        success: false,
        message: message,
        // Tampilkan stack trace hanya di mode development
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};

export default errorHandler;
