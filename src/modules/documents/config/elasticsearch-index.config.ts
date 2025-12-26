/**
 * Elasticsearch Index Configuration
 *
 * Defines the index mapping and settings for document search.
 *
 * Features:
 * - Custom analyzers for construction-specific terms
 * - Drawing number analyzer (A-101, A-101.1)
 * - Spec section analyzer (03 30 00)
 * - Autocomplete with edge n-grams
 * - Permission fields for security filtering
 * - Multi-language support
 */

export const ELASTICSEARCH_INDEX_NAME = 'documents';
export const ELASTICSEARCH_INDEX_ALIAS = 'documents-search';

/**
 * Index settings with custom analyzers
 */
export const indexSettings = {
  analysis: {
    // Custom analyzers
    analyzer: {
      // Drawing number analyzer: A-101, A-101.1, etc.
      drawing_number_analyzer: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'drawing_number_filter'],
      },

      // Specification section analyzer: 03 30 00, 033000, etc.
      spec_section_analyzer: {
        type: 'custom',
        tokenizer: 'whitespace',
        filter: ['lowercase', 'spec_section_filter'],
      },

      // Autocomplete analyzer with edge n-grams
      autocomplete_analyzer: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'autocomplete_filter'],
      },

      // Autocomplete search analyzer (no edge n-grams)
      autocomplete_search_analyzer: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase'],
      },

      // Standard with synonyms for construction terms
      construction_analyzer: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'construction_synonym_filter', 'stop', 'snowball'],
      },
    },

    // Custom filters
    filter: {
      // Edge n-gram for autocomplete (2-20 chars)
      autocomplete_filter: {
        type: 'edge_ngram',
        min_gram: 2,
        max_gram: 20,
      },

      // Drawing number filter - preserve special chars
      drawing_number_filter: {
        type: 'word_delimiter',
        preserve_original: true,
        split_on_numerics: false,
        split_on_case_change: false,
      },

      // Spec section filter - normalize spaces
      spec_section_filter: {
        type: 'pattern_replace',
        pattern: '\\s+',
        replacement: '',
      },

      // Construction term synonyms
      construction_synonym_filter: {
        type: 'synonym',
        synonyms: [
          'dwg,drawing,drwg',
          'spec,specification',
          'arch,architectural',
          'struct,structural',
          'mech,mechanical',
          'elec,electrical',
          'plumb,plumbing',
          'hvac,heating ventilating air conditioning',
          'gfrc,glass fiber reinforced concrete',
          'rfi,request for information',
          'aso,architectural supplemental information',
          'rfp,request for proposal',
        ],
      },
    },
  },

  // Index configuration
  number_of_shards: 2,
  number_of_replicas: 1,
  max_result_window: 10000,
};

/**
 * Index mapping - field definitions
 */
export const indexMapping = {
  properties: {
    // Document identification
    documentId: {
      type: 'keyword',
    },
    projectId: {
      type: 'keyword',
    },
    folderId: {
      type: 'keyword',
    },

    // Document metadata
    name: {
      type: 'text',
      analyzer: 'construction_analyzer',
      fields: {
        keyword: { type: 'keyword' },
        autocomplete: {
          type: 'text',
          analyzer: 'autocomplete_analyzer',
          search_analyzer: 'autocomplete_search_analyzer',
        },
      },
    },

    description: {
      type: 'text',
      analyzer: 'construction_analyzer',
    },

    documentType: {
      type: 'keyword',
    },

    // Drawing-specific fields
    drawingNumber: {
      type: 'text',
      analyzer: 'drawing_number_analyzer',
      fields: {
        keyword: { type: 'keyword' },
        autocomplete: {
          type: 'text',
          analyzer: 'autocomplete_analyzer',
          search_analyzer: 'autocomplete_search_analyzer',
        },
      },
    },

    discipline: {
      type: 'keyword',
    },

    // Specification-specific fields
    specSection: {
      type: 'text',
      analyzer: 'spec_section_analyzer',
      fields: {
        keyword: { type: 'keyword' },
      },
    },

    division: {
      type: 'keyword',
    },

    // File information
    mimeType: {
      type: 'keyword',
    },

    fileSize: {
      type: 'long',
    },

    // Version information
    versionNumber: {
      type: 'keyword',
    },

    versionComment: {
      type: 'text',
      analyzer: 'construction_analyzer',
    },

    status: {
      type: 'keyword',
    },

    // Content (extracted via OCR/text extraction)
    content: {
      type: 'text',
      analyzer: 'construction_analyzer',
    },

    // Tags and categorization
    tags: {
      type: 'keyword',
    },

    // User information
    createdBy: {
      type: 'keyword',
    },

    createdByName: {
      type: 'text',
      fields: {
        keyword: { type: 'keyword' },
      },
    },

    modifiedBy: {
      type: 'keyword',
    },

    modifiedByName: {
      type: 'text',
      fields: {
        keyword: { type: 'keyword' },
      },
    },

    // Timestamps
    createdAt: {
      type: 'date',
    },

    updatedAt: {
      type: 'date',
    },

    // Permission fields (for security filtering)
    allowedUserIds: {
      type: 'keyword',
    },

    allowedRoles: {
      type: 'keyword',
    },

    allowedDisciplines: {
      type: 'keyword',
    },

    isPublic: {
      type: 'boolean',
    },

    restrictedIpRanges: {
      type: 'keyword',
    },

    // Cross-references and relationships
    relatedDocumentIds: {
      type: 'keyword',
    },

    // Suggest field for autocomplete
    suggest: {
      type: 'completion',
      contexts: [
        {
          name: 'project',
          type: 'category',
        },
        {
          name: 'documentType',
          type: 'category',
        },
      ],
    },

    // Additional metadata (flexible JSON)
    metadata: {
      type: 'object',
      enabled: false, // Not indexed, but stored
    },
  },
};

/**
 * Complete index configuration
 */
export const documentIndexConfig = {
  settings: indexSettings,
  mappings: indexMapping,
};
