module.exports = {
    projects: {
        'project1': {
            run: ['build'],
            linkedProjects: [
                'project3',
            ]
        },
        'project2': {
            run: ['build'],
            linkedProjects: [
                'project3',
                'project4'
            ],
            childProjects: {
                'project5': {
                    // run: ['build'], // Not yet supported
                    linkedProjects: [
                        'project3',
                    ]
                },
                'project6': {
                    // run: ['build'], // Not yet supported
                    linkedProjects: [
                        'project7'
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
