const db = require("../db/index");

const NormalReport = async( startDate, endDate, facID, begin, status ) => {
    const query = `
        SELECT 
            di.code, 
            li.name, 
            f.fac, 
            pd.plan, 
            pd.product, 
            t.type, 
            di.withdrawal_amount, 
            di.date,
            nli.total_amount, 
            di.psu_code,
            li.status,
            di.note
        FROM disbursed_items AS di
        JOIN items AS li 
            ON li.code = di.code
        JOIN facs AS f ON f.id = li.facID
        JOIN (
            SELECT pd.product, p.plan, pd.id, p.id AS plan_id
            FROM products AS pd
            JOIN plans AS p ON p.id = pd.planID 
        ) AS pd 
        ON li.productID = pd.id
        JOIN types AS t 
            ON t.id = li.typeID
        JOIN (
            SELECT facID, productID, typeID, SUM(li.total_amount) AS total_amount
            FROM items AS li
            WHERE status = '${status}'
            GROUP BY facID, productID, typeID
        ) AS nli ON nli.facID = li.facID
                AND nli.productID = li.productID
                AND nli.typeID = li.typeID
        WHERE li.status = '${status}'
        ${ !(facID == 0) ? `AND li.facID = ${facID}` : "" }
        ${ begin ? '' : `AND date BETWEEN '${startDate}' AND '${endDate}'` }
        ORDER BY date asc;
        `
    const data = (await db.raw(query))[0];
    const formattedData = []
    const seen = new Set()
    data.forEach( item => {
        const { id, code, name, withdrawal_amount, psu_code, date, fac, plan, product, type, total_amount, note } = item
        if (!seen.has(fac)){
            seen.add(fac)
            formattedData.push(
                {
                    [fac]: [
                        { 
                            plan, 
                            product,
                            type, 
                            total_amount, 
                            records: [ 
                                {
                                    id,
                                    code, 
                                    name, 
                                    withdrawal_amount, 
                                    psu_code,
                                    date,
                                    note
                                }
                            ] 
                        }
                    ]
                }
            )
        
        } else if (seen.has(fac)){
            let indexFac = formattedData.findIndex(item => Object.keys(item) == fac);
            let indexOfValues = formattedData[indexFac][fac].findIndex(item => item.plan == plan && item.product == product && item.type == type);
            if (indexOfValues == -1){
                formattedData[indexFac][fac].push( 
                    { 
                        plan, 
                        product,
                        type, 
                        total_amount,
                        records:[
                            {
                                id,
                                code, 
                                name, 
                                withdrawal_amount, 
                                psu_code,
                                date,
                                note
                            }
                        ]
                    }
                )
            } else {
                formattedData[indexFac][fac][indexOfValues].records.push( 
                    { 
                        id,
                        code,
                        name,
                        withdrawal_amount, 
                        psu_code,
                        date,
                        note
                    }
                )
            }
        }
    });

    return formattedData;
}

const DeprivationReport = async( startDate, endDate, facID, begin ) => {
    const query = `
        SELECT f.fac, 
               li.name, 
               di.code, 
               di.date, 
               di.psu_code, 
               li.total_amount, 
               di.note,
               di.withdrawal_amount 
        FROM disbursed_items AS di 
        JOIN items AS li 
            ON li.code = di.code 
        JOIN facs AS f 
            ON li.facID = f.id
        WHERE li.status = 'D'
        ${ begin ? '' : `AND date BETWEEN '${startDate}' AND '${endDate}'` }
        ${ !(facID == 0) ? `AND li.facID = ${facID}` : "" }
        ORDER BY date asc;
    `

    const data = (await db.raw(query))[0];
    const seen = new Set();
    const formattedData = []
    data.forEach( item => {
        const { code, name, withdrawal_amount, psu_code, date, fac, total_amount, note } = item;
        if ( !seen.has(fac) ){
            seen.add(fac);
            formattedData.push(
                {
                    [fac] : [
                        {
                            code,
                            name,
                            total_amount,
                            records: [
                                {
                                    date,
                                    psu_code,
                                    withdrawal_amount,
                                    note
                                }
                            ]
                        }
                    ]
                }
            )
        } else {
            const indexFac = formattedData.findIndex(item => Object.keys(item) == fac);
            const indexOfValues = formattedData[indexFac][fac].findIndex(item => item.code == code );
            if ( indexOfValues == -1 ){
                formattedData[indexFac][fac].push( 
                    { 
                        code,
                        name,
                        total_amount,
                        records:[
                            {
                                date,
                                psu_code,
                                withdrawal_amount,
                                note
                            }
                        ]
                    }
                )
            } else {
                formattedData[indexFac][fac][indexOfValues].records.push( 
                    { 
                        date,
                        psu_code,
                        withdrawal_amount,
                        note
                } )
            }
        }
    });

    return formattedData;
}


const OverviewReport = async (startDate, endDate, facID, begin) => {
    const baseQuery = `
        SELECT 
            di.code, 
            li.name, 
            f.fac, 
            pd.plan, 
            pd.product, 
            t.type, 
            di.withdrawal_amount, 
            di.date,
            di.psu_code,
            li.status,
            di.note
        FROM disbursed_items AS di
        JOIN items AS li ON li.code = di.code
        JOIN facs AS f ON f.id = li.facID
        JOIN (
            SELECT pd.product, p.plan, pd.id, p.id AS plan_id
            FROM products AS pd
            JOIN plans AS p ON p.id = pd.planID
        ) AS pd ON li.productID = pd.id
        JOIN types AS t ON t.id = li.typeID
    `;

    const whereClause = [];
    if (!begin) {
        whereClause.push(`date BETWEEN '${startDate}' AND '${endDate}'`);
    }
    if (facID !== 0) {
        whereClause.push(`li.facID = ${facID}`);
    }

    const query = `
        ${baseQuery}
        ${whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : ''}
        ORDER BY date ASC;
    `;

    try {
        const result = await db.raw(query);
        return result[0];
    } catch (error) {
        console.error('Error executing the query:', error);
        throw error;
    }
};

const BalanceReport = async( facID ) => {
    const baseQuery = `
        SELECT li.code,
               li.name,
               f.fac,
               pd.plan,
               pd.product,
               t.type,
               li.total_amount,
               li.balance,
               li.status
        FROM items AS li
        JOIN facs AS f
            ON li.facID = f.id
        JOIN (
            SELECT pd.product, p.plan, pd.id, p.id AS plan_id
            FROM products AS pd
            JOIN plans AS p ON p.id = pd.planID
        ) AS pd ON li.productID = pd.id
        JOIN types AS t ON t.id = li.typeID
    `
    const whereClause = [];
    if (facID !== 0) {
        whereClause.push(`li.facID = ${facID}`);
    }

    const query = `
        ${baseQuery}
        ${whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : ''}
    `;

    try {
        const result = await db.raw(query);
        return result[0];
    } catch (error) {
        console.error('Error executing the query:', error);
        throw error;
    } 
}


module.exports = { NormalReport, DeprivationReport, OverviewReport, BalanceReport }