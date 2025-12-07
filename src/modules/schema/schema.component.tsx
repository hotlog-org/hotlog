'use client'

import { SchemaTable } from './fields/table/schema-table.component'
import { SchemaEditor } from './fields/editor/schema-editor.component'
import useSchemaService from './schema.service'

export function SchemaComponent() {
  const service = useSchemaService()

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>{service.t('title')}</h1>

      <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
        <SchemaTable
          rows={service.rows}
          onOpen={service.openSchema}
          t={service.t}
        />
      </div>

      <SchemaEditor
        open={Boolean(service.selectedSchema)}
        schema={service.selectedSchema}
        fields={service.fieldTree}
        fieldCount={service.fieldCount}
        t={service.t}
        maxDepth={service.maxDepth}
        selectedFieldId={service.selectedFieldId}
        onClose={service.closeSchema}
        onSchemaNameChange={(name) =>
          service.selectedSchema &&
          service.updateSchemaName(service.selectedSchema.id, name)
        }
        onDeleteSchema={() =>
          service.selectedSchema &&
          service.deleteSchema(service.selectedSchema.id)
        }
        onAddField={(parentId) =>
          service.selectedSchema &&
          service.addField(service.selectedSchema.id, parentId)
        }
        onDeleteField={(fieldId) =>
          service.selectedSchema &&
          service.deleteField(service.selectedSchema.id, fieldId)
        }
        onFieldNameChange={(fieldId, name) =>
          service.selectedSchema &&
          service.updateFieldName(service.selectedSchema.id, fieldId, name)
        }
        onFieldTypeChange={(fieldId, type) =>
          service.selectedSchema &&
          service.updateFieldType(service.selectedSchema.id, fieldId, type)
        }
        onEnumChange={(fieldId, values) =>
          service.selectedSchema &&
          service.updateEnumValues(service.selectedSchema.id, fieldId, values)
        }
        onRangeChange={(fieldId, range) =>
          service.selectedSchema &&
          service.updateNumberRange(service.selectedSchema.id, fieldId, range)
        }
        onItemTypeChange={(fieldId, type) =>
          service.selectedSchema &&
          service.updateItemType(service.selectedSchema.id, fieldId, type)
        }
        onSelectField={(fieldId) => service.selectField(fieldId)}
      />
    </div>
  )
}
