import simplejson as json

aid = json.load(open('us-aid.json'))

programs = {}       # number of rows per program
countries = {}      # number of rows per country
edges = []

for row in aid:
    program = row['program_name']
    country = row['country_name']

    if program in programs:
        programs[program] += 1
    else:
        programs[program] = 1

    if country in countries:
        countries[country] += 1
    else:
        countries[country] = 1

    keys = row.keys()
    for key in keys:
        if key[0:2] == "FY":
            edges.append({
                'country': country,
                'program': program,
                'year': key[2:],
                'value': str(row[key]),
            })

f = open('us-aid.gdf', 'w')

# define nodes
f.write('nodedef>name VARCHAR,type VARCHAR\n')
for name in programs:
    f.write('"' + name +'",program\n')
for name in countries:
    f.write('"' + name +'",country\n')

# define nodes
f.write('edgedef>node1 VARCHAR,node2 VARCHAR, value INT\n')
for edge in edges:
    f.write('"' + edge['program'] + '","' \
                + edge['country'] + '",'  \
                + edge['value']   + '\n'  )
