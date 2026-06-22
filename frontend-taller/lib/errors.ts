type ApiErrorPayload = {
  message?: string;
  error?: string;
};

type ApiError = {
  message?: string;
  response?: {
    status?: number;
    data?: ApiErrorPayload;
  };
};

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  const apiError = error as ApiError;
  return apiError.response?.data?.message || apiError.response?.data?.error || fallback;
};

export const getAuthErrorMessage = (error: unknown, fallback: string) => {
  const apiError = error as ApiError;
  const status = apiError.response?.status;
  const serverMessage = apiError.response?.data?.message || apiError.response?.data?.error;

  if (status === 401) {
    return 'Correo o contraseña incorrectos. Revisa tus datos e intenta nuevamente.';
  }

  if (status === 403) {
    return 'Tu cuenta no tiene permiso para realizar esta accion.';
  }

  if (status === 409) {
    return serverMessage || 'Ya existe una cuenta registrada con esos datos.';
  }

  if (status === 400) {
    return serverMessage || 'Revisa los campos marcados e intenta nuevamente.';
  }

  return serverMessage || apiError.message || fallback;
};
