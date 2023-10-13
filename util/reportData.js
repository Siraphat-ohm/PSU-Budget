const db = require("../db/index");

const reportDataN = async( startDate, endDate, facID, begin ) => {
    const query = `
        SELECT 
            di.id,
            di.code, 
            li.name, 
            f.fac, 
            pd.plan, 
            pd.product, 
            t.type, 
            di.withdrawal_amount, 
            di.date,
            nli.totalAmount, 
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
            SELECT facID, productID, typeID, SUM(li.total_amount) AS totalAmount
            FROM items AS li
            GROUP BY facID, productID, typeID
        ) AS nli ON nli.facID = li.facID
                AND nli.productID = li.productID
                AND nli.typeID = li.typeID
        WHERE li.status = 'N'
        ${ begin ? '' : `AND date BETWEEN '${startDate}' AND '${endDate}'` }
        ${ !(facID == 0) ? `AND li.facID = ${facID}` : "" }
        ORDER BY date asc;
        `
    const data = (await db.raw(query))[0];
    const formattedData = []
    const seen = new Set()
    data.forEach( item => {
        const { id, code, name, withdrawal_amount, psu_code, date, fac, plan, product, type, totalAmount } = item
        if (!seen.has(fac)){
            seen.add(fac)
            formattedData.push(
                {
                    [fac]: [
                        { 
                            plan, 
                            product,
                            type, 
                            totalAmount, 
                            items: [ 
                                {
                                    id,
                                    code, 
                                    name, 
                                    withdrawal_amount, 
                                    psu_code,
                                    date
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
                        totalAmount,
                        items:[
                            {
                                id,
                                code, 
                                name, 
                                withdrawal_amount, 
                                psu_code,
                                date
                            }
                        ]
                    }
                )
            } else {
                formattedData[indexFac][fac][indexOfValues].items.push( 
                    { 
                        id,
                        code,
                        name,
                        withdrawal_amount, 
                        psu_code,
                        date
                    }
                )
            }
        }
    });

    return formattedData;
}

const reportDataS = async( startDate, endDate, facID, begin ) => {
    const query = `
        SELECT 
            f.fac, 
            li.name, 
            li.total_amount, 
            di.code, 
            di.psu_code, 
            di.withdrawal_amount, 
            di.date,
            di.note
        FROM disbursed_items AS di
        INNER JOIN items AS li
            ON di.code = li.code
        INNER JOIN facs AS f
            ON di.facID = f.id
        WHERE li.status = 'S'
        ${ begin ? '' : `AND date BETWEEN '${startDate}' AND '${endDate}'` }
        ${ !(facID == 0) ? `AND li.facID = ${facID}` : "" }
        ORDER BY date asc;
    `

    const data = (await db.raw(query))[0];
    const formattedData = []
    const seen = new Set()
    data.forEach( item => {
        const { fac, name, total_amount, code, psu_code, date, withdrawal_amount } = item
        if ( !seen.has(fac) ){
            seen.add(fac);
            formattedData.push(
                {
                    [fac]:{
                        name, total_amount, items:[
                            {
                                code,
                                name,
                                psu_code,
                                date,
                                withdrawal_amount
                            }
                        ]
                    }
                }
            )
        } else if (seen.has(fac)){
            const indexFac = formattedData.findIndex(item => Object.keys(item) == fac);
            formattedData[indexFac][fac].items.push(
                {
                    code,
                    name,
                    psu_code,
                    date,
                    withdrawal_amount
                }
            )
        }
    })

    return formattedData;
}

module.exports = { reportDataN, reportDataS }