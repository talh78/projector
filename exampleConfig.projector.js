module.exports = {
    projects: {
        'project1': {
            run: ['build'],
            linkedProjects: [
                'linked-project1',
            ]
        },
        'project2': {
            run: ['build'],
            linkedProjects: [
                'linked-project1',
                'linked-project2'
            ],
            childProjects: {
                'child-project1': {
                    // run: ['build'], // Not yet supported
                    linkedProjects: [
                        'linked-project1',
                    ]
                },
                'child-project2': {
                    // run: ['build'], // Not yet supported
                    linkedProjects: [
                        'linked-project3'
                    ]
                }
            }
        }
    },
    commands: {build: [
        {cmd: 'yarn'},
        {cmd: 'yarn', args: ['build']}
    ]}
};
