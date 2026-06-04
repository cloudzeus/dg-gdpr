import { NextResponse } from "next/server";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "GDPR Rights API",
    version: "1.0.0",
    description:
      "Public API for submitting and tracking GDPR data subject rights requests. Integrate with your websites to allow visitors to exercise their rights under GDPR (Articles 15–21).\n\n**Authentication:** All requests require an `X-API-Key` header with a valid API key issued from the GDPR Compliance OS admin panel.\n\n**Response deadline:** Under GDPR Article 12, all requests must be responded to within **30 calendar days**.",
    contact: { name: "GDPR Compliance OS", url: process.env.NEXTAUTH_URL },
  },
  servers: [{ url: `${process.env.NEXTAUTH_URL}/api/public/gdpr`, description: "Production" }],
  security: [{ ApiKeyAuth: [] }],
  components: {
    securitySchemes: {
      ApiKeyAuth: { type: "apiKey", in: "header", name: "X-API-Key", description: "API key issued from GDPR Compliance OS admin panel." },
    },
    schemas: {
      DsrType: {
        type: "string",
        enum: ["ERASURE", "PORTABILITY", "ACCESS", "RECTIFICATION", "OBJECTION", "RESTRICTION", "WITHDRAW_CONSENT"],
        description: "ERASURE=Art.17, PORTABILITY=Art.20, ACCESS=Art.15, RECTIFICATION=Art.16, OBJECTION=Art.21, RESTRICTION=Art.18, WITHDRAW_CONSENT=Art.7(3)",
      },
      DsrStatus: { type: "string", enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "REJECTED", "PARTIAL"] },
      CreateRequestBody: {
        type: "object",
        required: ["type", "subjectName", "subjectEmail"],
        properties: {
          type: { $ref: "#/components/schemas/DsrType" },
          subjectName: { type: "string", example: "Γιώργος Παπαδόπουλος", description: "Full name of the data subject" },
          subjectEmail: { type: "string", format: "email", example: "gpapadopoulos@example.com" },
          subjectPhone: { type: "string", example: "+30 210 1234567", nullable: true },
          description: { type: "string", example: "Αιτούμαι τη διαγραφή όλων των προσωπικών δεδομένων μου.", nullable: true },
          systems: { type: "array", items: { type: "string" }, example: ["CRM", "Newsletter"], nullable: true, description: "Systems from which data should be erased/exported" },
        },
      },
      CreateRequestResponse: {
        type: "object",
        properties: {
          requestId: { type: "string", example: "clx1234abcdef" },
          type: { $ref: "#/components/schemas/DsrType" },
          status: { $ref: "#/components/schemas/DsrStatus" },
          message: { type: "string" },
          estimatedResponseDate: { type: "string", format: "date", example: "2025-06-15" },
        },
      },
      StatusResponse: {
        type: "object",
        properties: {
          requestId: { type: "string" },
          type: { $ref: "#/components/schemas/DsrType" },
          status: { $ref: "#/components/schemas/DsrStatus" },
          subjectName: { type: "string" },
          subjectEmail: { type: "string", format: "email" },
          createdAt: { type: "string", format: "date-time" },
          estimatedResponseDate: { type: "string", format: "date" },
          completedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      PolicyType: {
        type: "string",
        enum: [
          "SECURITY_POLICY", "ACCEPTABLE_USE", "DATA_RETENTION", "INCIDENT_RESPONSE", "BYOD",
          "PASSWORD_POLICY", "BACKUP", "ACCESS_CONTROL", "PRIVACY_NOTICE", "COOKIE_POLICY",
          "DATA_BREACH", "EMPLOYEE_HANDBOOK", "ETHICS_CODE", "CLEAR_DESK", "REMOTE_WORK",
          "VENDOR_MANAGEMENT", "CHANGE_MANAGEMENT", "BUSINESS_CONTINUITY", "OTHER",
        ],
        description: "Κατηγορία πολιτικής ασφαλείας / διακυβέρνησης.",
      },
      PolicyStatus: { type: "string", enum: ["DRAFT", "UNDER_REVIEW", "ACTIVE", "ARCHIVED"] },
      Policy: {
        type: "object",
        properties: {
          id: { type: "string", example: "clx1234abcdef" },
          title: { type: "string", example: "Πολιτική Ασφάλειας Πληροφοριών" },
          type: { $ref: "#/components/schemas/PolicyType" },
          version: { type: "string", example: "1.0" },
          status: { $ref: "#/components/schemas/PolicyStatus" },
          content: { type: "string", nullable: true, description: "Πλήρες περιεχόμενο της πολιτικής (HTML)." },
          fileUrl: { type: "string", nullable: true, description: "Εξωτερικός σύνδεσμος αρχείου, αν υπάρχει." },
          tags: { type: "array", items: { type: "string" }, nullable: true },
          owner: {
            type: "object", nullable: true,
            properties: { name: { type: "string", nullable: true }, email: { type: "string", nullable: true } },
          },
          effectiveDate: { type: "string", format: "date", nullable: true },
          reviewDate: { type: "string", format: "date", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      PolicyListResponse: {
        type: "object",
        properties: {
          count: { type: "integer", example: 12 },
          policies: { type: "array", items: { $ref: "#/components/schemas/Policy" } },
        },
      },
      PolicyDetail: {
        allOf: [
          { $ref: "#/components/schemas/Policy" },
          {
            type: "object",
            properties: {
              history: {
                type: "array",
                description: "Ιστορικό εκδόσεων της πολιτικής.",
                items: {
                  type: "object",
                  properties: {
                    version: { type: "string" },
                    changeNote: { type: "string", nullable: true },
                    changedBy: { type: "string", nullable: true },
                    createdAt: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        ],
      },
      RopaDepartment: {
        type: "object",
        properties: {
          id: { type: "string" },
          department: { type: "string", example: "Ανθρώπινο Δυναμικό" },
          icon: { type: "string", nullable: true },
          entries: {
            type: "array",
            description: "Πίνακας δραστηριοτήτων επεξεργασίας του τμήματος (Άρθρο 30).",
            items: { type: "object", additionalProperties: true },
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      RopaListResponse: {
        type: "object",
        properties: {
          count: { type: "integer", example: 5 },
          departments: { type: "array", items: { $ref: "#/components/schemas/RopaDepartment" } },
        },
      },
      RopaUpsertBody: {
        type: "object",
        required: ["department", "entries"],
        properties: {
          department: { type: "string", example: "Ανθρώπινο Δυναμικό", description: "Όνομα τμήματος (μοναδικό κλειδί — γίνεται upsert)." },
          icon: { type: "string", nullable: true, example: "users" },
          entries: {
            type: "array",
            description: "Πλήρης λίστα δραστηριοτήτων επεξεργασίας. Αντικαθιστά πλήρως το υπάρχον περιεχόμενο του τμήματος.",
            items: { type: "object", additionalProperties: true },
            example: [
              { activity: "Μισθοδοσία", purpose: "Καταβολή αποδοχών", legalBasis: "Νομική υποχρέωση", dataCategories: ["Στοιχεία ταυτότητας", "Τραπεζικά"], retention: "5 έτη" },
            ],
          },
        },
      },
      RopaUpsertResponse: {
        type: "object",
        properties: {
          id: { type: "string" },
          department: { type: "string" },
          icon: { type: "string", nullable: true },
          entries: { type: "array", items: { type: "object", additionalProperties: true } },
          entryCount: { type: "integer", example: 4 },
          created: { type: "boolean", description: "true αν δημιουργήθηκε νέο τμήμα, false αν ενημερώθηκε υπάρχον." },
          updatedAt: { type: "string", format: "date-time" },
          message: { type: "string" },
        },
      },
      OfficerRole: { type: "string", enum: ["DPO", "SECURITY_OFFICER", "COMPLIANCE_OFFICER"] },
      Officer: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string", nullable: true },
          email: { type: "string", format: "email", nullable: true },
          phone: { type: "string", nullable: true },
          role: { $ref: "#/components/schemas/OfficerRole" },
          roleLabel: { type: "string", example: "Υπεύθυνος Προστασίας Δεδομένων (DPO)" },
          roleLabelEn: { type: "string", example: "Data Protection Officer" },
          department: { type: "string", nullable: true },
          position: { type: "string", nullable: true },
          isActive: { type: "boolean" },
        },
      },
      OfficerListResponse: {
        type: "object",
        properties: {
          count: { type: "integer", example: 3 },
          officers: { type: "array", items: { $ref: "#/components/schemas/Officer" } },
        },
      },
      Error: {
        type: "object",
        properties: { error: { type: "string" } },
      },
    },
  },
  paths: {
    "/request": {
      post: {
        summary: "Submit a GDPR rights request",
        description: "Creates a new data subject request. Sends confirmation email to the subject and notifies the DPO. Compliant with GDPR Articles 12, 15–21.",
        operationId: "createRequest",
        tags: ["Requests"],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateRequestBody" } } } },
        responses: {
          "201": { description: "Request created successfully", content: { "application/json": { schema: { $ref: "#/components/schemas/CreateRequestResponse" } } } },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Missing or invalid API key", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/request/{requestId}": {
      get: {
        summary: "Get request status",
        description: "Check the current status of a previously submitted data subject request.",
        operationId: "getRequestStatus",
        tags: ["Requests"],
        parameters: [{ name: "requestId", in: "path", required: true, schema: { type: "string" }, description: "The requestId returned when the request was created" }],
        responses: {
          "200": { description: "Request status", content: { "application/json": { schema: { $ref: "#/components/schemas/StatusResponse" } } } },
          "401": { description: "Missing or invalid API key", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Request not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/export/{requestId}": {
      get: {
        summary: "Download data export (PORTABILITY requests only)",
        description: "Downloads the data export once a PORTABILITY request is COMPLETED. Returns JSON or CSV depending on the `format` query parameter.",
        operationId: "exportData",
        tags: ["Portability"],
        parameters: [
          { name: "requestId", in: "path", required: true, schema: { type: "string" } },
          { name: "format", in: "query", required: false, schema: { type: "string", enum: ["json", "csv"], default: "json" } },
        ],
        responses: {
          "200": { description: "Data export file", content: { "application/json": { schema: { type: "object" } }, "text/csv": { schema: { type: "string" } } } },
          "401": { description: "Missing or invalid API key", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Portability request not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "409": { description: "Request not yet completed", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/policies": {
      get: {
        summary: "List security & governance policies",
        description: "Επιστρέφει τη λίστα των πολιτικών ασφαλείας μαζί με το πλήρες περιεχόμενό τους. Από προεπιλογή επιστρέφονται μόνο οι ΕΝΕΡΓΕΣ (ACTIVE) πολιτικές.",
        operationId: "listPolicies",
        tags: ["Policies"],
        parameters: [
          { name: "status", in: "query", required: false, schema: { type: "string", enum: ["DRAFT", "UNDER_REVIEW", "ACTIVE", "ARCHIVED", "ALL"], default: "ACTIVE" }, description: "Φίλτρο κατάστασης. Χρησιμοποίησε ALL για όλες." },
          { name: "type", in: "query", required: false, schema: { $ref: "#/components/schemas/PolicyType" }, description: "Φίλτρο κατηγορίας πολιτικής." },
        ],
        responses: {
          "200": { description: "Λίστα πολιτικών", content: { "application/json": { schema: { $ref: "#/components/schemas/PolicyListResponse" } } } },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Missing or invalid API key", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/policies/{id}": {
      get: {
        summary: "Get a single policy with its content & version history",
        description: "Επιστρέφει μία πολιτική με το πλήρες περιεχόμενο και το ιστορικό εκδόσεών της.",
        operationId: "getPolicy",
        tags: ["Policies"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Η πολιτική", content: { "application/json": { schema: { $ref: "#/components/schemas/PolicyDetail" } } } },
          "401": { description: "Missing or invalid API key", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Policy not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/ropa": {
      get: {
        summary: "List the Record of Processing Activities (Article 30)",
        description: "Επιστρέφει το Αρχείο Δραστηριοτήτων ομαδοποιημένο ανά τμήμα.",
        operationId: "listRopa",
        tags: ["RoPA"],
        parameters: [
          { name: "department", in: "query", required: false, schema: { type: "string" }, description: "Φίλτρο για συγκεκριμένο τμήμα." },
        ],
        responses: {
          "200": { description: "Το Αρχείο Δραστηριοτήτων", content: { "application/json": { schema: { $ref: "#/components/schemas/RopaListResponse" } } } },
          "401": { description: "Missing or invalid API key", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      post: {
        summary: "Send / upsert processing activities of a department",
        description: "Στέλνει από εξωτερική εφαρμογή το Αρχείο Δραστηριοτήτων ενός τμήματος. Αν το τμήμα υπάρχει, αντικαθίσταται πλήρως (idempotent)· αλλιώς δημιουργείται.",
        operationId: "upsertRopa",
        tags: ["RoPA"],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RopaUpsertBody" } } } },
        responses: {
          "200": { description: "Τμήμα ενημερώθηκε", content: { "application/json": { schema: { $ref: "#/components/schemas/RopaUpsertResponse" } } } },
          "201": { description: "Τμήμα δημιουργήθηκε", content: { "application/json": { schema: { $ref: "#/components/schemas/RopaUpsertResponse" } } } },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Missing or invalid API key", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/consent/projects": {
      get: {
        summary: "List consent projects",
        security: [{ ApiKeyAuth: [] }],
        responses: {
          "200": { description: "Array of consent projects with counts" },
          "401": { description: "Invalid API key" },
        },
      },
    },
    "/consent/projects/{slug}/records": {
      get: {
        summary: "List all consent records for a project (JSON export)",
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: "slug", in: "path", required: true, schema: { type: "string" } },
          { name: "status", in: "query", required: false, schema: { type: "string", enum: ["PENDING", "CONFIRMED", "WITHDRAWN"] } },
        ],
        responses: {
          "200": { description: "Consent records" },
          "401": { description: "Invalid API key" },
          "404": { description: "Project not found" },
        },
      },
    },
    "/officers": {
      get: {
        summary: "List DPO, CISO and Compliance Officer",
        description: "Επιστρέφει τα στοιχεία του Υπεύθυνου Προστασίας Δεδομένων (DPO), του Υπεύθυνου Ασφάλειας Πληροφοριών (CISO / SECURITY_OFFICER) και του Υπεύθυνου Συμμόρφωσης.",
        operationId: "listOfficers",
        tags: ["Officers"],
        parameters: [
          { name: "role", in: "query", required: false, schema: { $ref: "#/components/schemas/OfficerRole" }, description: "Φίλτρο για συγκεκριμένο ρόλο." },
          { name: "includeInactive", in: "query", required: false, schema: { type: "boolean", default: false }, description: "Συμπερίληψη ανενεργών χρηστών." },
        ],
        responses: {
          "200": { description: "Λίστα υπευθύνων", content: { "application/json": { schema: { $ref: "#/components/schemas/OfficerListResponse" } } } },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Missing or invalid API key", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
  },
  tags: [
    { name: "Requests", description: "Create and track GDPR data subject requests" },
    { name: "Portability", description: "Data portability export endpoints (Article 20)" },
    { name: "Policies", description: "Λίστα και περιεχόμενο πολιτικών ασφαλείας" },
    { name: "RoPA", description: "Αρχείο Δραστηριοτήτων Επεξεργασίας (Άρθρο 30) — ανάγνωση & αποστολή από εξωτερική εφαρμογή" },
    { name: "Officers", description: "DPO, CISO & Υπεύθυνος Συμμόρφωσης" },
  ],
};

export function GET() {
  return NextResponse.json(spec, { headers: { "Access-Control-Allow-Origin": "*" } });
}
