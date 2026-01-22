// Strings de interfaz en español
// Preparado para multi-idioma futuro

export const es = {
    // General
    app: {
        name: 'Facturas',
        company: 'Cacao & Avocado',
    },

    // Navigation
    nav: {
        dashboard: 'Inicio',
        clients: 'Clientes',
        invoices: 'Facturas',
        settings: 'Configuración',
        logout: 'Cerrar sesión',
    },

    // Auth
    auth: {
        login: 'Iniciar sesión',
        loginTitle: 'Acceso al Sistema',
        loginSubtitle: 'Ingresa tus credenciales para continuar',
        email: 'Correo electrónico',
        password: 'Contraseña',
        loginButton: 'Iniciar sesión',
        loggingIn: 'Iniciando sesión...',
        loginError: 'Error al iniciar sesión',
        logoutSuccess: 'Sesión cerrada correctamente',
    },

    // Dashboard
    dashboard: {
        title: 'Dashboard',
        welcome: 'Bienvenido',
        totalInvoices: 'Total Facturas',
        totalClients: 'Total Clientes',
        pendingAmount: 'Por Cobrar',
        paidThisMonth: 'Cobrado este Mes',
        recentInvoices: 'Facturas Recientes',
        viewAll: 'Ver todas',
    },

    // Clients
    clients: {
        title: 'Clientes',
        newClient: 'Nuevo Cliente',
        editClient: 'Editar Cliente',
        name: 'Nombre',
        email: 'Correo electrónico',
        company: 'Empresa',
        taxId: 'NIT / ID Fiscal',
        address: 'Dirección',
        notes: 'Notas',
        createdAt: 'Creado',
        actions: 'Acciones',
        save: 'Guardar',
        cancel: 'Cancelar',
        delete: 'Eliminar',
        deleteConfirm: '¿Estás seguro de eliminar este cliente?',
        noClients: 'No hay clientes registrados',
        noClientsDesc: 'Crea tu primer cliente para empezar a facturar',
        saved: 'Cliente guardado correctamente',
        deleted: 'Cliente eliminado correctamente',
    },

    // Invoices
    invoices: {
        title: 'Facturas',
        newInvoice: 'Nueva Factura',
        editInvoice: 'Editar Factura',
        invoiceNumber: 'Número',
        client: 'Cliente',
        issueDate: 'Fecha de Emisión',
        dueDate: 'Fecha de Vencimiento',
        status: 'Estado',
        currency: 'Moneda',
        subtotal: 'Subtotal',
        tax: 'Impuesto',
        total: 'Total',
        notes: 'Notas',
        actions: 'Acciones',
        save: 'Guardar',
        cancel: 'Cancelar',
        delete: 'Eliminar',
        deleteConfirm: '¿Estás seguro de eliminar esta factura?',
        noInvoices: 'No hay facturas',
        noInvoicesDesc: 'Crea tu primera factura',
        saved: 'Factura guardada correctamente',
        deleted: 'Factura eliminada correctamente',
        selectClient: 'Selecciona un cliente',

        // Status
        statusDraft: 'Borrador',
        statusSent: 'Enviada',
        statusPaid: 'Pagada',
        statusVoid: 'Anulada',

        // Actions
        generatePdf: 'Generar PDF',
        downloadPdf: 'Descargar PDF',
        sendEmail: 'Enviar por Email',
        markPaid: 'Marcar como Pagada',
        markVoid: 'Anular',
        viewPublic: 'Ver enlace público',
        copyLink: 'Copiar enlace',
        linkCopied: 'Enlace copiado',

        // Items
        items: 'Conceptos',
        addItem: 'Agregar línea',
        removeItem: 'Eliminar línea',
        description: 'Descripción',
        quantity: 'Cantidad',
        unitPrice: 'Precio Unitario',
        lineTotal: 'Total Línea',
        noItems: 'Agrega al menos un concepto',
    },

    // Filters
    filters: {
        all: 'Todos',
        status: 'Estado',
        month: 'Mes',
        client: 'Cliente',
        search: 'Buscar...',
        clear: 'Limpiar filtros',
    },

    // Common
    common: {
        loading: 'Cargando...',
        error: 'Error',
        success: 'Éxito',
        save: 'Guardar',
        cancel: 'Cancelar',
        edit: 'Editar',
        delete: 'Eliminar',
        confirm: 'Confirmar',
        back: 'Volver',
        yes: 'Sí',
        no: 'No',
        required: 'Este campo es requerido',
        invalidEmail: 'Correo inválido',
    },

    // Email
    email: {
        subject: 'Factura {number} - Cacao & Avocado',
        sent: 'Email enviado correctamente',
        error: 'Error al enviar el email',
    },

    // PDF
    pdf: {
        generating: 'Generando PDF...',
        generated: 'PDF generado correctamente',
        error: 'Error al generar el PDF',
        billTo: 'Facturar a',
        from: 'De',
        invoiceDate: 'Fecha',
        dueDate: 'Vencimiento',
        paymentTerms: 'Términos de pago',
        thankYou: 'Gracias por su preferencia',
    },

    // Public invoice view
    public: {
        invoice: 'Factura',
        downloadPdf: 'Descargar PDF',
        notFound: 'Factura no encontrada',
        notFoundDesc: 'La factura que buscas no existe o el enlace ha expirado',
    },
} as const

export type TranslationKey = typeof es
