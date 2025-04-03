import React from 'react'

export default function ViewSelector({view}) {
return (
    <div style={{ display: 'flex', gap: '10px' }}>
            <p onClick={() => { view = 'month' }} style={{ cursor: 'pointer' }}>Měsíc</p>
            <p onClick={() => { view = 'week' }} style={{ cursor: 'pointer' }}>Týden</p>
            <p onClick={() => { view = 'day' }} style={{ cursor: 'pointer' }}>Den</p>
    </div>
)
}
